-- Trigger functions are not API endpoints. Prevent direct RPC execution while
-- retaining their use by the equipment table trigger.
revoke all on function public.enforce_invoice_cashing_permission() from public;
revoke all on function public.enforce_invoice_cashing_permission() from anon;
revoke all on function public.enforce_invoice_cashing_permission() from authenticated;
