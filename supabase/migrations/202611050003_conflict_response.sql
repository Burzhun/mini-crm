begin;

-- 40001 is reserved for retryable serialization failures. PostgREST 14 can
-- retry it indefinitely. A stale UI action is a permanent HTTP 409 conflict.
create or replace function public.change_task_status(p_task_id uuid, p_expected_status public.task_status, p_target public.task_status, p_comment text default null)
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
  update public.tasks set status = p_target where id = p_task_id returning * into v_task;
  perform set_config('app.task_comment', '', true);
  return v_task;
end; $$;

revoke all on function public.change_task_status(uuid,public.task_status,public.task_status,text) from public, anon;
grant execute on function public.change_task_status(uuid,public.task_status,public.task_status,text) to authenticated;

commit;
