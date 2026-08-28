-- Track invoice status per maintenance cycle. New assets have no invoice due
-- until a completed maintenance report creates the next invoice cycle.
alter table public.maintenance_logs
  add column if not exists invoice_cashed boolean not null default false,
  add column if not exists invoice_cashed_at timestamptz,
  add column if not exists invoice_cashed_by uuid references auth.users(id) on delete set null;

update public.maintenance_logs
set invoice_status = 'PENDING'
where invoice_status is null or invoice_status not in ('PENDING', 'UPLOADED', 'CASHED');

alter table public.maintenance_logs
  alter column invoice_status set default 'PENDING',
  alter column invoice_status set not null;

alter table public.equipment
  drop constraint if exists equipment_invoice_status_check;

with latest_logs as (
  select distinct on (equipment_record_id)
    id, equipment_record_id, invoice_path, invoice_url, invoice_status
  from public.maintenance_logs
  order by equipment_record_id, completed_at desc, id desc
)
update public.equipment e
set invoice_status = case
  when latest_logs.id is null then 'AWAITING_MAINTENANCE'
  when coalesce(latest_logs.invoice_path, latest_logs.invoice_url) is null then 'PENDING'
  else 'UPLOADED'
end,
    invoice_cashed = false
from latest_logs
where latest_logs.equipment_record_id = e.id;

update public.equipment
set invoice_status = 'AWAITING_MAINTENANCE',
    invoice_cashed = false
where not exists (
  select 1
  from public.maintenance_logs
  where maintenance_logs.equipment_record_id = equipment.id
);

alter table public.equipment
  add constraint equipment_invoice_status_check
  check (invoice_status in ('AWAITING_MAINTENANCE', 'PENDING', 'UPLOADED'));

alter table public.equipment
  alter column invoice_status set default 'AWAITING_MAINTENANCE',
  alter column invoice_status set not null;

create or replace function public.enforce_invoice_cashing_permission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.invoice_cashed is distinct from old.invoice_cashed then
    if not public.is_admin() then
      raise exception 'Only administrators can mark an invoice as cashed.';
    end if;

    if new.invoice_cashed is true then
      if coalesce(nullif(new.invoice_path, ''), nullif(new.invoice_url, '')) is null then
        raise exception 'An invoice must be uploaded before it can be marked as cashed.';
      end if;

      new.invoice_cashed_at := coalesce(new.invoice_cashed_at, now());
      new.invoice_cashed_by := auth.uid();
      new.invoice_status := 'AWAITING_MAINTENANCE';

      update public.maintenance_logs
      set invoice_cashed = true,
          invoice_cashed_at = new.invoice_cashed_at,
          invoice_cashed_by = new.invoice_cashed_by,
          invoice_status = 'CASHED'
      where id = (
        select id
        from public.maintenance_logs
        where equipment_record_id = new.id
          and coalesce(nullif(invoice_path, ''), nullif(invoice_url, '')) is not null
        order by completed_at desc, id desc
        limit 1
      );
    else
      new.invoice_cashed_at := null;
      new.invoice_cashed_by := null;
      new.invoice_status := case
        when coalesce(nullif(new.invoice_path, ''), nullif(new.invoice_url, '')) is not null then 'UPLOADED'
        else 'PENDING'
      end;
    end if;
  end if;

  return new;
end;
$$;
