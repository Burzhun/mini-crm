begin;
create type public.app_role as enum ('manager', 'worker');
create type public.task_status as enum ('new', 'in_progress', 'review', 'rework', 'accepted');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 180),
  role public.app_role not null default 'worker'
);
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 180),
  address text not null check (length(btrim(address)) between 1 and 400),
  created_at timestamptz not null default now()
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 240),
  description text not null default '' check (length(description) <= 10000),
  project_id uuid not null references public.projects(id) on delete cascade,
  assignee_id uuid not null references public.profiles(id),
  status public.task_status not null default 'new',
  author_id uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);
create table public.task_history (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null,
  actor_id uuid not null references public.profiles(id),
  from_status public.task_status,
  to_status public.task_status not null,
  comment text check (length(comment) <= 4000),
  created_at timestamptz not null default clock_timestamp()
);
create index tasks_assignee_idx on public.tasks(assignee_id);
create index tasks_project_idx on public.tasks(project_id);
create index task_history_task_idx on public.task_history(task_id, created_at);

-- Keep the original task UUID after deletion; only the status trigger writes history.
comment on column public.task_history.task_id is
  'Original task UUID; intentionally no cascading FK so audit events survive task/project deletion.';

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create function private.is_manager() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'manager'); $$;
revoke all on function private.is_manager() from public, anon;
grant execute on function private.is_manager() to authenticated;

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_history enable row level security;

revoke all on public.profiles, public.projects, public.tasks, public.task_history from anon, authenticated;
grant select on public.profiles, public.projects, public.tasks, public.task_history to authenticated;
grant insert(name,address), update(name,address), delete on public.projects to authenticated;
grant insert(title,description,project_id,assignee_id,author_id), update(title,description,project_id,assignee_id), delete on public.tasks to authenticated;
grant all on public.profiles, public.projects, public.tasks, public.task_history to service_role;

create policy profiles_read on public.profiles for select to authenticated using (
  private.is_manager() or id = auth.uid() or exists (
    select 1 from public.tasks t where t.author_id = profiles.id and t.assignee_id = auth.uid()
  )
);
create policy projects_read on public.projects for select to authenticated using (
  private.is_manager() or exists (select 1 from public.tasks t where t.project_id = projects.id and t.assignee_id = auth.uid())
);
create policy projects_create on public.projects for insert to authenticated with check (private.is_manager());
create policy projects_edit on public.projects for update to authenticated using (private.is_manager()) with check (private.is_manager());
create policy projects_delete on public.projects for delete to authenticated using (private.is_manager());
create policy tasks_read on public.tasks for select to authenticated using (private.is_manager() or assignee_id = auth.uid());
create policy tasks_create on public.tasks for insert to authenticated with check (private.is_manager() and author_id = auth.uid() and status = 'new');
create policy tasks_edit on public.tasks for update to authenticated using (private.is_manager()) with check (private.is_manager());
create policy tasks_delete on public.tasks for delete to authenticated using (private.is_manager());
create policy history_read on public.task_history for select to authenticated using (
  private.is_manager() or exists (select 1 from public.tasks t where t.id = task_history.task_id)
);

-- Trigger is the single writer of history; clients have SELECT only.
create function private.guard_task() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_manager boolean := private.is_manager();
  v_comment text := nullif(regexp_replace(current_setting('app.task_comment', true), '^\s+|\s+$', '', 'g'), '');
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if tg_op = 'INSERT' then
    if not v_manager or new.status <> 'new' or new.author_id <> auth.uid() then
      raise exception 'Only a manager can create a new task as its author' using errcode = '42501';
    end if;
    new.created_at := clock_timestamp();
  else
    if new.id is distinct from old.id or new.author_id is distinct from old.author_id or new.created_at is distinct from old.created_at then
      raise exception 'Task identity, author and creation date are immutable' using errcode = '42501';
    end if;
    if (new.title,new.description,new.project_id,new.assignee_id) is distinct from (old.title,old.description,old.project_id,old.assignee_id) and not v_manager then
      raise exception 'Only managers can edit task details' using errcode = '42501';
    end if;
    if new.status is distinct from old.status then
      if not (
        (not v_manager and old.assignee_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role = 'worker') and
          ((old.status in ('new','rework') and new.status = 'in_progress') or (old.status = 'in_progress' and new.status = 'review')))
        or (v_manager and old.status = 'review' and new.status in ('accepted','rework'))
      ) then raise exception 'Forbidden status transition' using errcode = '42501'; end if;
      if new.status = 'rework' and v_comment is null then raise exception 'Rework comment is required' using errcode = '23514'; end if;
      if length(v_comment) > 4000 then raise exception 'Comment is too long' using errcode = '23514'; end if;
    end if;
  end if;
  if not exists (select 1 from public.profiles where id = new.assignee_id and role = 'worker') then
    raise exception 'Assignee must be a worker' using errcode = '23514';
  end if;
  return new;
end; $$;
create function private.record_task_status() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.task_history(task_id,actor_id,from_status,to_status) values(new.id,auth.uid(),null,new.status);
  elsif new.status is distinct from old.status then
    insert into public.task_history(task_id,actor_id,from_status,to_status,comment)
    values(new.id,auth.uid(),old.status,new.status,nullif(regexp_replace(current_setting('app.task_comment',true), '^\s+|\s+$', '', 'g'),''));
  end if;
  return new;
end; $$;
revoke all on function private.guard_task(), private.record_task_status() from public, anon, authenticated;
create trigger task_guard before insert or update on public.tasks for each row execute function private.guard_task();
create trigger task_status_history after insert or update on public.tasks for each row execute function private.record_task_status();

create function public.change_task_status(p_task_id uuid, p_expected_status public.task_status, p_target public.task_status, p_comment text default null)
returns public.tasks language plpgsql security definer set search_path = '' as $$
declare v_task public.tasks;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into v_task from public.tasks where id = p_task_id for update;
  if not found then raise exception 'Task is unavailable' using errcode = '42501'; end if;
  if not private.is_manager() and v_task.assignee_id <> auth.uid() then raise exception 'Task is unavailable' using errcode = '42501'; end if;
  if p_expected_status is null or v_task.status <> p_expected_status then
    raise exception 'Task was changed. Refresh and retry.' using errcode = 'PT409';
  end if;
  if p_target is null or p_target = v_task.status then raise exception 'Status must change' using errcode = '23514'; end if;
  perform set_config('app.task_comment', coalesce(p_comment,''), true);
  -- The trigger validates the actor and edge, then atomically appends history.
  update public.tasks set status = p_target where id = p_task_id returning * into v_task;
  perform set_config('app.task_comment', '', true);
  return v_task;
end; $$;
revoke all on function public.change_task_status(uuid,public.task_status,public.task_status,text) from public, anon;
grant execute on function public.change_task_status(uuid,public.task_status,public.task_status,text) to authenticated;
commit;
