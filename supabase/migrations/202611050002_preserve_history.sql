begin;

-- task_id deliberately retains the original UUID after a task is deleted.
-- Only the trusted status trigger can insert audit events through client API.
-- A cascading foreign key would let DELETE /tasks erase protected history.
alter table public.task_history
  drop constraint if exists task_history_task_id_fkey;

comment on column public.task_history.task_id is
  'Original task UUID; intentionally no cascading FK so audit events survive task/project deletion.';

drop policy if exists history_read on public.task_history;
create policy history_read on public.task_history for select to authenticated using (
  private.is_manager() or exists (
    select 1 from public.tasks t where t.id = task_history.task_id
  )
);

commit;
