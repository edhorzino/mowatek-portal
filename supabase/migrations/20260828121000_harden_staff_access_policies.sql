-- Enforce administrative control at the database layer instead of relying on
-- hidden user-interface actions.

drop policy if exists "Enable access for authenticated users" on public.employees;
create policy "Authenticated staff can view employee directory"
  on public.employees for select to authenticated using (true);
create policy "Administrators manage employee directory"
  on public.employees for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Allow authenticated full access on clients" on public.clients;
create policy "Authenticated staff can view clients"
  on public.clients for select to authenticated using (true);
create policy "Authenticated staff can add clients"
  on public.clients for insert to authenticated with check (true);
create policy "Administrators can update clients"
  on public.clients for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy "Administrators can delete clients"
  on public.clients for delete to authenticated using ((select public.is_admin()));

drop policy if exists "Public read profiles for authenticated users" on public.profiles;
create policy "Users can view their own profile and administrators can view all profiles"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "Allow admin updates" on public.profiles;
create policy "Administrators can update profiles"
  on public.profiles for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Allow everyone to read active sessions" on public.user_sessions;
create policy "Administrators can view session records"
  on public.user_sessions for select to authenticated
  using ((select public.is_admin()));

-- Keep the existing self-service writes, but use a cached auth lookup so
-- policies remain efficient as the staff directory and session history grow.
drop policy if exists "Allow user registration insert" on public.profiles;
create policy "Allow user registration insert"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

drop policy if exists "Allow authenticated users to insert their own session" on public.user_sessions;
create policy "Allow authenticated users to insert their own session"
  on public.user_sessions for insert to authenticated
  with check (user_id = (select auth.uid()));

-- These columns are used by ownership and audit-history lookups. The indexes
-- prevent those checks from degrading as records accumulate.
create index if not exists company_updates_created_by_idx
  on public.company_updates (created_by);
create index if not exists document_permissions_granted_by_idx
  on public.document_permissions (granted_by);
create index if not exists documents_owner_id_idx
  on public.documents (owner_id);
create index if not exists maintenance_logs_invoice_cashed_by_idx
  on public.maintenance_logs (invoice_cashed_by);

-- Trigger functions are not public API endpoints. Their owning triggers keep
-- working after direct execution is revoked.
create or replace function public.check_employee_whitelist()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.employees
    where lower(work_email) = lower(new.email)
  ) then
    raise exception 'Access Denied: Your email address is not registered in the Mowatek employee directory. Please contact your administrator.';
  end if;

  select jsonb_set(
    coalesce(new.raw_user_meta_data, '{}'::jsonb),
    '{display_name}',
    to_jsonb(first_name || ' ' || last_name)
  ) into new.raw_user_meta_data
  from public.employees
  where lower(work_email) = lower(new.email);

  return new;
end;
$$;

revoke all on function public.check_employee_whitelist() from public, anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;
