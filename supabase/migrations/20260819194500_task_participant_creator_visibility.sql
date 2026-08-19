-- Allow task creators to see the participants they selected without exposing
-- participant lists for unrelated tasks.

create schema if not exists private;

create or replace function private.is_task_creator(target_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.tasks
    where id = target_task_id
      and lower(creator_email) = lower((select auth.jwt() ->> 'email'))
  );
$$;

revoke all on function private.is_task_creator(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_task_creator(uuid) to authenticated;

drop policy if exists "Task members can view participants" on public.task_participants;
create policy "Task members can view participants"
on public.task_participants for select to authenticated
using (
  lower(user_email) = lower((select auth.jwt() ->> 'email'))
  or (select private.is_task_creator(task_id))
);
