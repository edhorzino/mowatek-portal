-- Project Alpha: reliable, shared task reminders.

alter table public.tasks
  add column if not exists creator_email text,
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by_email text,
  add column if not exists delivery_status text not null default 'pending',
  add column if not exists delivery_attempts integer not null default 0,
  add column if not exists last_delivery_error text,
  add column if not exists reminder_version integer not null default 1;

update public.tasks
set creator_email = lower(user_email)
where creator_email is null;

alter table public.tasks
  alter column creator_email set not null;

alter table public.tasks
  drop constraint if exists tasks_delivery_status_check,
  add constraint tasks_delivery_status_check check (delivery_status in ('pending', 'sending', 'sent', 'failed')),
  drop constraint if exists tasks_status_check,
  add constraint tasks_status_check check (status in ('Pending', 'Sent', 'Completed', 'Cancelled'));

create table if not exists public.task_participants (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_email text not null,
  participant_role text not null default 'cc' check (participant_role in ('owner', 'cc')),
  added_by_email text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (task_id, user_email)
);

create table if not exists public.task_reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  reminder_version integer not null,
  resend_email_id text,
  status text not null default 'processing' check (status in ('processing', 'sent', 'failed')),
  attempt_count integer not null default 1,
  recipient_count integer not null default 1,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  sent_at timestamptz,
  unique (task_id, reminder_version)
);

create index if not exists tasks_due_reminders_idx
  on public.tasks (reminder_date)
  where status = 'Pending' and delivery_status in ('pending', 'failed');
create index if not exists task_participants_user_email_idx
  on public.task_participants (lower(user_email), task_id);
create index if not exists task_reminder_deliveries_task_idx
  on public.task_reminder_deliveries (task_id, reminder_version);

create or replace function public.prepare_task_reminder()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.creator_email := lower(coalesce(new.creator_email, new.user_email));
    new.user_email := new.creator_email;
    new.delivery_status := coalesce(new.delivery_status, 'pending');
    new.delivery_attempts := coalesce(new.delivery_attempts, 0);
    new.reminder_version := coalesce(new.reminder_version, 1);
  else
    if new.creator_email is distinct from old.creator_email
      or new.user_email is distinct from old.user_email then
      raise exception 'Task ownership cannot be changed.';
    end if;

    if new.reminder_date is distinct from old.reminder_date then
      new.reminder_version := old.reminder_version + 1;
      new.delivery_status := 'pending';
      new.delivery_attempts := 0;
      new.last_delivery_error := null;
    end if;

    if new.status = 'Completed' and old.status is distinct from 'Completed' then
      new.completed_at := coalesce(new.completed_at, timezone('utc', now()));
      new.completed_by_email := coalesce(new.completed_by_email, lower(auth.jwt() ->> 'email'));
    elsif new.status <> 'Completed' then
      new.completed_at := null;
      new.completed_by_email := null;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.add_task_owner_participant()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  insert into public.task_participants (task_id, user_email, participant_role, added_by_email)
  values (new.id, new.creator_email, 'owner', new.creator_email)
  on conflict (task_id, user_email) do nothing;
  return new;
end;
$$;

create or replace function public.validate_task_participant()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  task_owner text;
begin
  new.user_email := lower(trim(new.user_email));
  new.added_by_email := lower(trim(new.added_by_email));

  select creator_email into task_owner from public.tasks where id = new.task_id;
  if task_owner is null then
    raise exception 'Task does not exist.';
  end if;

  if new.participant_role = 'owner' and new.user_email <> task_owner then
    raise exception 'Only the task owner can be assigned the owner role.';
  end if;

  if new.participant_role = 'cc' and not exists (
    select 1 from public.employees
    where lower(work_email) = new.user_email
      and lower(coalesce(status, 'active')) = 'active'
  ) then
    raise exception 'Shared recipients must be active Mowatek employees.';
  end if;

  return new;
end;
$$;

drop trigger if exists prepare_task_reminder on public.tasks;
create trigger prepare_task_reminder
before insert or update on public.tasks
for each row execute function public.prepare_task_reminder();

drop trigger if exists add_task_owner_participant on public.tasks;
create trigger add_task_owner_participant
after insert on public.tasks
for each row execute function public.add_task_owner_participant();

drop trigger if exists validate_task_participant on public.task_participants;
create trigger validate_task_participant
before insert or update on public.task_participants
for each row execute function public.validate_task_participant();

alter table public.task_participants enable row level security;
alter table public.task_reminder_deliveries enable row level security;

drop policy if exists "Users can manage their own tasks" on public.tasks;
drop policy if exists "Task members can view tasks" on public.tasks;
drop policy if exists "Task creators can create tasks" on public.tasks;
drop policy if exists "Task members can update tasks" on public.tasks;
drop policy if exists "Task creators can delete tasks" on public.tasks;

create policy "Task members can view tasks"
on public.tasks for select to authenticated
using (
  lower(creator_email) = lower((select auth.jwt() ->> 'email'))
  or id in (
    select task_id from public.task_participants
    where lower(user_email) = lower((select auth.jwt() ->> 'email'))
  )
);

create policy "Task creators can create tasks"
on public.tasks for insert to authenticated
with check (
  lower(creator_email) = lower((select auth.jwt() ->> 'email'))
  and lower(user_email) = lower((select auth.jwt() ->> 'email'))
);

create policy "Task members can update tasks"
on public.tasks for update to authenticated
using (
  lower(creator_email) = lower((select auth.jwt() ->> 'email'))
  or id in (
    select task_id from public.task_participants
    where lower(user_email) = lower((select auth.jwt() ->> 'email'))
  )
)
with check (
  lower(creator_email) = lower((select auth.jwt() ->> 'email'))
  or id in (
    select task_id from public.task_participants
    where lower(user_email) = lower((select auth.jwt() ->> 'email'))
  )
);

create policy "Task creators can delete tasks"
on public.tasks for delete to authenticated
using (lower(creator_email) = lower((select auth.jwt() ->> 'email')));

create policy "Task members can view participants"
on public.task_participants for select to authenticated
using (lower(user_email) = lower((select auth.jwt() ->> 'email')));

create policy "Task creators can add participants"
on public.task_participants for insert to authenticated
with check (
  exists (
    select 1 from public.tasks
    where tasks.id = task_participants.task_id
      and lower(tasks.creator_email) = lower((select auth.jwt() ->> 'email'))
  )
);

create policy "Task creators can remove participants"
on public.task_participants for delete to authenticated
using (
  exists (
    select 1 from public.tasks
    where tasks.id = task_participants.task_id
      and lower(tasks.creator_email) = lower((select auth.jwt() ->> 'email'))
  )
);

create policy "Task members can view reminder deliveries"
on public.task_reminder_deliveries for select to authenticated
using (
  exists (
    select 1 from public.tasks
    where tasks.id = task_reminder_deliveries.task_id
      and (
        lower(tasks.creator_email) = lower((select auth.jwt() ->> 'email'))
        or tasks.id in (
          select task_id from public.task_participants
          where lower(user_email) = lower((select auth.jwt() ->> 'email'))
        )
  )
  )
);

grant select, insert, update, delete on public.task_participants to authenticated;
grant select on public.task_reminder_deliveries to authenticated;

revoke all on function public.prepare_task_reminder() from public;
revoke all on function public.add_task_owner_participant() from public;
revoke all on function public.validate_task_participant() from public;
