-- Revoke anon RPC on is_admin_user (RLS policies still call it internally)
REVOKE EXECUTE ON FUNCTION public.is_admin_user() FROM anon;
