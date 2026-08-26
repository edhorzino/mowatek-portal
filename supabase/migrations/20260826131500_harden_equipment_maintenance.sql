-- Secure equipment administration and make maintenance completion a single
-- audited database operation. Asset IDs remain manually assigned.
create schema if not exists private;

alter table public.equipment
  add column if not exists maintenance_report_path text,
  add column if not exists invoice_path text,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

alter table public.maintenance_logs
  add column if not exists maintenance_report_path text,
  add column if not exists invoice_path text;

-- Preserve the existing report by converting its legacy public URL to a
-- private Storage path before the bucket is made private.
update public.equipment
set maintenance_report_path = regexp_replace(maintenance_report_url, '^.*/maintenance-reports/', '')
where maintenance_report_path is null
  and maintenance_report_url like '%/maintenance-reports/%';

update public.maintenance_logs
set maintenance_report_path = regexp_replace(maintenance_report_url, '^.*/maintenance-reports/', '')
where maintenance_report_path is null
  and maintenance_report_url like '%/maintenance-reports/%';

update public.equipment
set invoice_path = regexp_replace(invoice_url, '^.*/maintenance-reports/', '')
where invoice_path is null
  and invoice_url like '%/maintenance-reports/%';

update public.maintenance_logs
set invoice_path = regexp_replace(invoice_url, '^.*/maintenance-reports/', '')
where invoice_path is null
  and invoice_url like '%/maintenance-reports/%';

update public.equipment
set invoice_cashed = false
where invoice_cashed is null;

alter table public.equipment
  alter column invoice_cashed set default false,
  alter column invoice_cashed set not null;

update public.equipment
set invoice_status = case
  when invoice_cashed then 'CASHED'
  when coalesce(invoice_path, invoice_url) is not null then 'UPLOADED'
  else 'PENDING'
end;

update public.maintenance_logs
set invoice_status = case
  when coalesce(invoice_path, invoice_url) is not null then 'UPLOADED'
  else 'PENDING'
end;

alter table public.equipment
  drop constraint if exists equipment_invoice_status_check;

alter table public.equipment
  add constraint equipment_invoice_status_check
  check (invoice_status in ('PENDING', 'UPLOADED', 'CASHED'));

alter table public.maintenance_logs
  drop constraint if exists maintenance_logs_invoice_status_check;

alter table public.maintenance_logs
  add constraint maintenance_logs_invoice_status_check
  check (invoice_status in ('PENDING', 'UPLOADED', 'CASHED'));

alter table public.maintenance_logs
  drop constraint if exists maintenance_logs_equipment_record_id_fkey;

alter table public.maintenance_logs
  add constraint maintenance_logs_equipment_record_id_fkey
  foreign key (equipment_record_id) references public.equipment(id) on delete restrict;

create index if not exists maintenance_logs_equipment_completed_idx
  on public.maintenance_logs (equipment_record_id, completed_at desc);

create or replace function private.track_equipment_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists track_equipment_change on public.equipment;
create trigger track_equipment_change
  before insert or update on public.equipment
  for each row execute function private.track_equipment_change();

alter table public.equipment enable row level security;
alter table public.maintenance_logs enable row level security;

drop policy if exists "Enable access for authenticated users" on public.equipment;
drop policy if exists "Authenticated staff can view equipment" on public.equipment;
drop policy if exists "Administrators can add equipment" on public.equipment;
drop policy if exists "Administrators can update equipment" on public.equipment;
drop policy if exists "Administrators can delete equipment" on public.equipment;

create policy "Authenticated staff can view equipment"
  on public.equipment for select to authenticated
  using (true);

create policy "Administrators can add equipment"
  on public.equipment for insert to authenticated
  with check ((select public.is_admin()));

create policy "Administrators can update equipment"
  on public.equipment for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Administrators can delete equipment"
  on public.equipment for delete to authenticated
  using ((select public.is_admin()));

drop policy if exists "Enable access for authenticated users" on public.maintenance_logs;
drop policy if exists "Authenticated staff can view maintenance history" on public.maintenance_logs;

create policy "Authenticated staff can view maintenance history"
  on public.maintenance_logs for select to authenticated
  using (true);

revoke all on public.equipment from anon;
revoke all on public.maintenance_logs from anon;
revoke all on public.equipment from authenticated;
revoke all on public.maintenance_logs from authenticated;
grant select, insert, update, delete on public.equipment to authenticated;
grant select on public.maintenance_logs to authenticated;

create or replace function public.complete_equipment_maintenance(
  p_equipment_id integer,
  p_completed_date date,
  p_notes text,
  p_report_path text,
  p_invoice_path text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  asset public.equipment;
  next_date date;
  new_log_id uuid;
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'Authentication is required to complete maintenance';
  end if;

  if p_completed_date is null or p_completed_date > current_date or p_completed_date < date '2000-01-01' then
    raise exception 'A valid completed maintenance date is required';
  end if;

  if p_report_path is null or p_report_path !~~ format('reports/%s/%%', caller_id) then
    raise exception 'The maintenance report must be uploaded by the signed-in staff member';
  end if;

  if p_invoice_path is not null and p_invoice_path !~~ format('reports/%s/%%', caller_id) then
    raise exception 'The invoice must be uploaded by the signed-in staff member';
  end if;

  select * into asset
  from public.equipment
  where id = p_equipment_id
  for update;

  if not found then
    raise exception 'Equipment record not found';
  end if;

  next_date := case upper(coalesce(asset.maintenance_frequency, 'MONTHLY'))
    when 'WEEKLY' then p_completed_date + 7
    when 'BIWEEKLY' then p_completed_date + 14
    when 'BIMONTHLY' then (p_completed_date + interval '2 months')::date
    when 'QUARTERLY' then (p_completed_date + interval '3 months')::date
    when 'ANNUALLY' then (p_completed_date + interval '1 year')::date
    when 'YEARLY' then (p_completed_date + interval '1 year')::date
    else (p_completed_date + interval '1 month')::date
  end;

  insert into public.maintenance_logs (
    equipment_record_id,
    equipment_id,
    asset_name,
    client_name,
    notes,
    performed_by,
    completed_at,
    maintenance_report_path,
    invoice_path,
    invoice_status
  ) values (
    asset.id,
    asset.asset_id,
    coalesce(asset.equipment, asset.asset_id),
    asset.client,
    coalesce(nullif(trim(p_notes), ''), 'Routine scheduled service completed.'),
    coalesce(auth.jwt() ->> 'email', 'Authenticated staff'),
    timezone('Africa/Lagos', p_completed_date::timestamp),
    p_report_path,
    p_invoice_path,
    case when p_invoice_path is null then 'PENDING' else 'UPLOADED' end
  ) returning id into new_log_id;

  update public.equipment
  set last_maintenance = p_completed_date,
      next_maintenance = next_date,
      maintenance_report_path = p_report_path,
      maintenance_report_url = null,
      invoice_path = p_invoice_path,
      invoice_url = null,
      invoice_status = case when p_invoice_path is null then 'PENDING' else 'UPLOADED' end,
      invoice_cashed = false,
      invoice_cashed_at = null,
      invoice_cashed_by = null
  where id = asset.id;

  return jsonb_build_object('log_id', new_log_id, 'next_maintenance', next_date);
end;
$$;

revoke all on function public.complete_equipment_maintenance(integer, date, text, text, text) from public;
revoke all on function public.complete_equipment_maintenance(integer, date, text, text, text) from anon;
grant execute on function public.complete_equipment_maintenance(integer, date, text, text, text) to authenticated;

update storage.buckets
set public = false,
    file_size_limit = 26214400,
    allowed_mime_types = array[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png'
    ]::text[]
where id = 'maintenance-reports';

drop policy if exists "Allow public reading of maintenance reports" on storage.objects;
drop policy if exists "Allow authenticated uploads to maintenance reports" on storage.objects;
drop policy if exists "Authenticated staff can read maintenance reports" on storage.objects;
drop policy if exists "Staff can upload their maintenance files" on storage.objects;
drop policy if exists "Staff can remove their failed maintenance uploads" on storage.objects;

create policy "Authenticated staff can read maintenance reports"
  on storage.objects for select to authenticated
  using (bucket_id = 'maintenance-reports');

create policy "Staff can upload their maintenance files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'maintenance-reports'
    and (storage.foldername(name))[1] = 'reports'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

create policy "Staff can remove their failed maintenance uploads"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'maintenance-reports'
    and (storage.foldername(name))[1] = 'reports'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );
