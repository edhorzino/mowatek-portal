-- A maintenance record may only reference files that were actually uploaded
-- by the signed-in staff member.
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

  if p_report_path is null
     or p_report_path !~~ format('reports/%s/%%', caller_id)
     or not exists (
       select 1 from storage.objects
       where bucket_id = 'maintenance-reports'
         and name = p_report_path
         and owner = caller_id
     ) then
    raise exception 'A maintenance report uploaded by the signed-in staff member is required';
  end if;

  if p_invoice_path is not null
     and (
       p_invoice_path !~~ format('reports/%s/%%', caller_id)
       or not exists (
         select 1 from storage.objects
         where bucket_id = 'maintenance-reports'
           and name = p_invoice_path
           and owner = caller_id
       )
     ) then
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
    equipment_record_id, equipment_id, asset_name, client_name, notes,
    performed_by, completed_at, maintenance_report_path, invoice_path, invoice_status
  ) values (
    asset.id, asset.asset_id, coalesce(asset.equipment, asset.asset_id), asset.client,
    coalesce(nullif(trim(p_notes), ''), 'Routine scheduled service completed.'),
    coalesce(auth.jwt() ->> 'email', 'Authenticated staff'),
    timezone('Africa/Lagos', p_completed_date::timestamp),
    p_report_path, p_invoice_path,
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
