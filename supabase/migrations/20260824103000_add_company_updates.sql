-- Company-wide announcement sending is intentionally limited to the named owner account.
create table if not exists public.company_update_senders (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now()
);

create table if not exists public.company_updates (
  id uuid primary key default gen_random_uuid(),
  subject text not null check (char_length(subject) between 1 and 180),
  message text not null check (char_length(message) between 1 and 12000),
  recipient_count integer not null default 0 check (recipient_count >= 0),
  accepted_count integer not null default 0 check (accepted_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  status text not null default 'sending' check (status in ('sending', 'sent', 'partial', 'failed')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists public.company_update_deliveries (
  id uuid primary key default gen_random_uuid(),
  company_update_id uuid not null references public.company_updates(id) on delete cascade,
  recipient_email text not null,
  resend_email_id text,
  status text not null check (status in ('accepted', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  constraint company_update_deliveries_email_normalized check (recipient_email = lower(recipient_email)),
  constraint company_update_deliveries_unique_recipient unique (company_update_id, recipient_email)
);

create index if not exists company_updates_created_at_idx on public.company_updates (created_at desc);
create index if not exists company_update_deliveries_update_idx on public.company_update_deliveries (company_update_id);

-- The sole initial sender is the current portal owner. Adding another sender later is an explicit database action.
insert into public.company_update_senders (user_id)
values ('b8643c4f-e934-46a7-81c2-b80c9c31258d')
on conflict (user_id) do nothing;

alter table public.company_update_senders enable row level security;
alter table public.company_updates enable row level security;
alter table public.company_update_deliveries enable row level security;

drop policy if exists "Users can see their own sender authorisation" on public.company_update_senders;
create policy "Users can see their own sender authorisation"
  on public.company_update_senders for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Authorised sender can view company updates" on public.company_updates;
create policy "Authorised sender can view company updates"
  on public.company_updates for select to authenticated
  using (
    created_by = (select auth.uid())
    and exists (select 1 from public.company_update_senders sender where sender.user_id = (select auth.uid()))
  );

drop policy if exists "Authorised sender can view company update deliveries" on public.company_update_deliveries;
create policy "Authorised sender can view company update deliveries"
  on public.company_update_deliveries for select to authenticated
  using (
    exists (
      select 1
      from public.company_updates update_record
      join public.company_update_senders sender on sender.user_id = update_record.created_by
      where update_record.id = company_update_id
        and update_record.created_by = (select auth.uid())
        and sender.user_id = (select auth.uid())
    )
  );

grant select on public.company_update_senders, public.company_updates, public.company_update_deliveries to authenticated;
