-- Keep administrator write authority separate from the general staff read
-- policy. This avoids evaluating two SELECT policies on every directory read.
drop policy if exists "Administrators manage employee directory" on public.employees;

create policy "Administrators can add employees"
  on public.employees for insert to authenticated
  with check ((select public.is_admin()));

create policy "Administrators can update employees"
  on public.employees for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Administrators can delete employees"
  on public.employees for delete to authenticated
  using ((select public.is_admin()));
