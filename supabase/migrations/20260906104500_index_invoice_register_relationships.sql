-- Cover foreign-key lookups used by the controlled invoice register.
create index if not exists invoice_officers_granted_by_idx
  on public.invoice_officers (granted_by);
create index if not exists company_invoices_created_by_idx
  on public.company_invoices (created_by);
create index if not exists company_invoices_cashed_by_idx
  on public.company_invoices (cashed_by);
create index if not exists company_invoices_vault_document_idx
  on public.company_invoices (vault_document_id);
