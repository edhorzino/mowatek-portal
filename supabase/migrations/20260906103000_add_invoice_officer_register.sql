-- Dedicated invoice-register authority for the appointed invoice officer.
create table if not exists public.invoice_officers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.invoice_officers enable row level security;
revoke all on table public.invoice_officers from anon;
grant select on table public.invoice_officers to authenticated;

create or replace function private.is_invoice_officer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.invoice_officers
    where user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_invoice_officer() from public;
grant execute on function private.is_invoice_officer() to authenticated, service_role;

drop policy if exists "Invoice officers can view their appointment" on public.invoice_officers;
create policy "Invoice officers can view their appointment"
  on public.invoice_officers for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

insert into public.invoice_officers (user_id, granted_by)
select profile_row.id,
       (select id from public.profiles where role = 'admin' order by created_at limit 1)
from public.profiles as profile_row
where lower(profile_row.email) = 'martha.obasi@mowatek.com'
on conflict (user_id) do nothing;

create table if not exists public.company_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  client_name text not null,
  issued_date date not null default current_date,
  amount numeric(14,2),
  currency text not null default 'NGN',
  status text not null default 'ISSUED'
    check (status in ('ISSUED', 'PART_PAID', 'PAID', 'CASHED', 'CANCELLED')),
  invoice_file_path text not null,
  file_name text not null,
  notes text,
  vault_document_id uuid references public.documents(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cashed_at timestamptz,
  cashed_by uuid references auth.users(id) on delete set null
);

alter table public.company_invoices enable row level security;
revoke all on table public.company_invoices from anon;
grant select, insert, update on table public.company_invoices to authenticated;
create index if not exists company_invoices_status_idx on public.company_invoices (status, issued_date desc);
create index if not exists company_invoices_client_idx on public.company_invoices (client_name);

drop policy if exists "Invoice officers can view company invoices" on public.company_invoices;
create policy "Invoice officers can view company invoices"
  on public.company_invoices for select to authenticated
  using ((select private.is_invoice_officer()) or (select public.is_admin()));

drop policy if exists "Invoice officers can create company invoices" on public.company_invoices;
create policy "Invoice officers can create company invoices"
  on public.company_invoices for insert to authenticated
  with check (
    ((select private.is_invoice_officer()) or (select public.is_admin()))
    and created_by = (select auth.uid())
  );

drop policy if exists "Invoice officers can update company invoices" on public.company_invoices;
create policy "Invoice officers can update company invoices"
  on public.company_invoices for update to authenticated
  using ((select private.is_invoice_officer()) or (select public.is_admin()))
  with check ((select private.is_invoice_officer()) or (select public.is_admin()));

create or replace function private.protect_company_invoice_cashing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'CASHED' and new.status is distinct from old.status then
    raise exception 'A cashed invoice is a permanent financial record.';
  end if;

  if new.status = 'CASHED'
     and old.status is distinct from 'CASHED'
     and current_setting('app.company_invoice_cashing', true) is distinct from 'true' then
    raise exception 'Use the controlled cashing action to cash an invoice.';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists protect_company_invoice_cashing on public.company_invoices;
create trigger protect_company_invoice_cashing
  before update on public.company_invoices
  for each row execute function private.protect_company_invoice_cashing();

create or replace function public.cash_company_invoice(p_invoice_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  invoice_row public.company_invoices;
  next_serial integer;
  document_year integer;
  document_code text;
  new_vault_document_id uuid;
begin
  if caller_id is null then
    raise exception 'Authentication is required to cash an invoice.';
  end if;

  if not ((select private.is_invoice_officer()) or (select public.is_admin())) then
    raise exception 'Only the appointed invoice officer or an administrator can cash invoices.';
  end if;

  select * into invoice_row
  from public.company_invoices
  where id = p_invoice_id
  for update;

  if not found then
    raise exception 'Invoice record not found.';
  end if;

  if invoice_row.status = 'CASHED' then
    return invoice_row.vault_document_id;
  end if;

  if invoice_row.invoice_file_path !~ '^documents/'
     or not exists (
       select 1 from storage.objects
       where bucket_id = 'mowatek-documents'
         and name = invoice_row.invoice_file_path
     ) then
    raise exception 'The invoice file must be uploaded before it can be cashed.';
  end if;

  document_year := extract(year from invoice_row.issued_date)::integer;
  insert into private.document_code_sequences as sequence_row (category, document_year, last_serial)
  values ('INV', document_year, 1)
  on conflict (category, document_year) do update
    set last_serial = sequence_row.last_serial + 1,
        updated_at = now()
  returning last_serial into next_serial;

  document_code := format('MWT-INV-%s-%s', document_year, lpad(next_serial::text, 3, '0'));

  insert into public.documents (
    doc_number, document_code, serial_number, year, doc_type, title,
    department, client, client_name, category, version, status,
    access, access_level, file_name, file_path, uploaded_by, owner_id, visibility
  ) values (
    document_code, document_code, lpad(next_serial::text, 3, '0'), document_year, 'INV',
    format('Invoice %s — %s', invoice_row.invoice_number, invoice_row.client_name),
    'FIN', invoice_row.client_name, invoice_row.client_name, 'INV', 'V01', 'CASHED',
    'INT', 'INT', invoice_row.file_name, invoice_row.invoice_file_path,
    coalesce(auth.jwt() ->> 'email', 'Invoice Officer'), caller_id, 'company'
  ) returning id into new_vault_document_id;

  perform set_config('app.company_invoice_cashing', 'true', true);
  update public.company_invoices
  set status = 'CASHED',
      vault_document_id = new_vault_document_id,
      cashed_at = now(),
      cashed_by = caller_id
  where id = invoice_row.id;

  return new_vault_document_id;
end;
$$;

revoke all on function public.cash_company_invoice(uuid) from public, anon;
grant execute on function public.cash_company_invoice(uuid) to authenticated;

create or replace function public.cash_equipment_invoice(p_equipment_id integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to cash an invoice.';
  end if;

  if not ((select private.is_invoice_officer()) or (select public.is_admin())) then
    raise exception 'Only the appointed invoice officer or an administrator can cash equipment invoices.';
  end if;

  update public.equipment
  set invoice_cashed = true
  where id = p_equipment_id
    and invoice_status = 'UPLOADED'
    and coalesce(nullif(invoice_path, ''), nullif(invoice_url, '')) is not null;

  if not found then
    raise exception 'An uploaded equipment invoice is required before cashing.';
  end if;
end;
$$;

revoke all on function public.cash_equipment_invoice(integer) from public, anon;
grant execute on function public.cash_equipment_invoice(integer) to authenticated;

create or replace function public.enforce_invoice_cashing_permission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.invoice_cashed is distinct from old.invoice_cashed then
    if not ((select public.is_admin()) or (select private.is_invoice_officer())) then
      raise exception 'Only an administrator or appointed invoice officer can mark an invoice as cashed.';
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
        select id from public.maintenance_logs
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
