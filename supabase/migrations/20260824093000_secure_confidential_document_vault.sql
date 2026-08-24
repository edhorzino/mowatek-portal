-- Secure document vault: visible metadata, protected files, and expiring employee access.
create schema if not exists private;

alter table public.documents
  add column if not exists visibility text not null default 'company',
  add column if not exists owner_id uuid references auth.users(id) on delete set null;

alter table public.documents
  drop constraint if exists documents_visibility_check;

alter table public.documents
  add constraint documents_visibility_check
  check (visibility in ('company', 'confidential'));

create table if not exists public.document_permissions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  employee_email text not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  granted_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_permissions_email_normalized check (employee_email = lower(employee_email)),
  constraint document_permissions_expiry_after_creation check (expires_at is null or expires_at > created_at)
);

create unique index if not exists document_permissions_unique_employee
  on public.document_permissions (document_id, employee_email);

create index if not exists document_permissions_active_lookup
  on public.document_permissions (document_id, employee_email, expires_at)
  where revoked_at is null;

create or replace function private.is_document_owner(target_document_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.documents d
      where d.id = target_document_id
        and d.owner_id = (select auth.uid())
    );
$$;

create or replace function private.is_active_employee_email(target_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.employees e
    where lower(coalesce(e.work_email, e.email, '')) = lower(target_email)
      and lower(coalesce(e.status, '')) = 'active'
  );
$$;

create or replace function private.can_access_document_file(target_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.documents d
      where d.file_path = target_path
        and (
          d.visibility = 'company'
          or d.owner_id = (select auth.uid())
          or exists (
            select 1
            from public.document_permissions dp
            where dp.document_id = d.id
              and dp.employee_email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
              and dp.revoked_at is null
              and (dp.expires_at is null or dp.expires_at > now())
          )
        )
    );
$$;

create or replace function private.is_document_file_owner(target_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.documents d
      where d.file_path = target_path
        and d.owner_id = (select auth.uid())
    );
$$;

revoke all on function private.is_document_owner(uuid) from public;
revoke all on function private.is_active_employee_email(text) from public;
revoke all on function private.can_access_document_file(text) from public;
revoke all on function private.is_document_file_owner(text) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_document_owner(uuid) to authenticated;
grant execute on function private.is_active_employee_email(text) to authenticated;
grant execute on function private.can_access_document_file(text) to authenticated;
grant execute on function private.is_document_file_owner(text) to authenticated;

create or replace function private.lock_document_owner()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.owner_id is null then
      new.owner_id := auth.uid();
    end if;
  elsif new.owner_id is distinct from old.owner_id then
    raise exception 'A document owner cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists lock_document_owner on public.documents;
create trigger lock_document_owner
  before insert or update on public.documents
  for each row execute function private.lock_document_owner();

create or replace function private.revoke_permissions_when_document_becomes_company_wide()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.visibility = 'confidential' and new.visibility = 'company' then
    update public.document_permissions
      set revoked_at = now(), updated_at = now()
      where document_id = new.id and revoked_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists revoke_document_permissions_when_company_wide on public.documents;
create trigger revoke_document_permissions_when_company_wide
  after update of visibility on public.documents
  for each row execute function private.revoke_permissions_when_document_becomes_company_wide();

alter table public.documents enable row level security;
alter table public.document_permissions enable row level security;

drop policy if exists "Allow authenticated full access on documents" on public.documents;
drop policy if exists "Authenticated users can see document records" on public.documents;
drop policy if exists "Document owners can register documents" on public.documents;
drop policy if exists "Document owners can edit their documents" on public.documents;

create policy "Authenticated users can see document records"
  on public.documents for select to authenticated using (true);

create policy "Document owners can register documents"
  on public.documents for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Document owners can edit their documents"
  on public.documents for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "Document owners can view permissions" on public.document_permissions;
drop policy if exists "Document owners can grant permissions" on public.document_permissions;
drop policy if exists "Document owners can update permissions" on public.document_permissions;

create policy "Document owners can view permissions"
  on public.document_permissions for select to authenticated
  using ((select private.is_document_owner(document_id)));

create policy "Document owners can grant permissions"
  on public.document_permissions for insert to authenticated
  with check (
    (select private.is_document_owner(document_id))
    and (select private.is_active_employee_email(employee_email))
    and granted_by = (select auth.uid())
  );

create policy "Document owners can update permissions"
  on public.document_permissions for update to authenticated
  using ((select private.is_document_owner(document_id)))
  with check (
    (select private.is_document_owner(document_id))
    and (select private.is_active_employee_email(employee_email))
    and granted_by = (select auth.uid())
  );

grant select, insert, update on public.documents to authenticated;
grant select, insert, update on public.document_permissions to authenticated;

update storage.buckets set public = false where id = 'mowatek-documents';

drop policy if exists "Give public access to mowatek-documents bucket" on storage.objects;
drop policy if exists "Authenticated users can upload document files" on storage.objects;
drop policy if exists "Authorized users can read document files" on storage.objects;
drop policy if exists "Document owners can remove document files" on storage.objects;

create policy "Authenticated users can upload document files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'mowatek-documents'
    and (storage.foldername(name))[1] = 'documents'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

create policy "Authorized users can read document files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'mowatek-documents'
    and (select private.can_access_document_file(name))
  );

create policy "Document owners can remove document files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'mowatek-documents'
    and (select private.is_document_file_owner(name))
  );
