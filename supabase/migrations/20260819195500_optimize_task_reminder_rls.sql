-- Keep the current user's email in an RLS init plan instead of evaluating it
-- for every scanned row.

drop policy if exists "Task members can view tasks" on public.tasks;
drop policy if exists "Task creators can create tasks" on public.tasks;
drop policy if exists "Task members can update tasks" on public.tasks;
drop policy if exists "Task creators can delete tasks" on public.tasks;
drop policy if exists "Task members can view participants" on public.task_participants;
drop policy if exists "Task creators can add participants" on public.task_participants;
drop policy if exists "Task creators can remove participants" on public.task_participants;
drop policy if exists "Task members can view reminder deliveries" on public.task_reminder_deliveries;

create policy "Task members can view tasks" on public.tasks for select to authenticated
using (lower(creator_email) = (select lower(auth.jwt() ->> 'email')) or id in (select task_id from public.task_participants where lower(user_email) = (select lower(auth.jwt() ->> 'email'))));

create policy "Task creators can create tasks" on public.tasks for insert to authenticated
with check (lower(creator_email) = (select lower(auth.jwt() ->> 'email')) and lower(user_email) = (select lower(auth.jwt() ->> 'email')));

create policy "Task members can update tasks" on public.tasks for update to authenticated
using (lower(creator_email) = (select lower(auth.jwt() ->> 'email')) or id in (select task_id from public.task_participants where lower(user_email) = (select lower(auth.jwt() ->> 'email'))))
with check (lower(creator_email) = (select lower(auth.jwt() ->> 'email')) or id in (select task_id from public.task_participants where lower(user_email) = (select lower(auth.jwt() ->> 'email'))));

create policy "Task creators can delete tasks" on public.tasks for delete to authenticated
using (lower(creator_email) = (select lower(auth.jwt() ->> 'email')));

create policy "Task members can view participants" on public.task_participants for select to authenticated
using (lower(user_email) = (select lower(auth.jwt() ->> 'email')) or (select private.is_task_creator(task_id)));

create policy "Task creators can add participants" on public.task_participants for insert to authenticated
with check (exists (select 1 from public.tasks where tasks.id = task_participants.task_id and lower(tasks.creator_email) = (select lower(auth.jwt() ->> 'email'))));

create policy "Task creators can remove participants" on public.task_participants for delete to authenticated
using (exists (select 1 from public.tasks where tasks.id = task_participants.task_id and lower(tasks.creator_email) = (select lower(auth.jwt() ->> 'email'))));

create policy "Task members can view reminder deliveries" on public.task_reminder_deliveries for select to authenticated
using (exists (select 1 from public.tasks where tasks.id = task_reminder_deliveries.task_id and (lower(tasks.creator_email) = (select lower(auth.jwt() ->> 'email')) or tasks.id in (select task_id from public.task_participants where lower(user_email) = (select lower(auth.jwt() ->> 'email'))))));
