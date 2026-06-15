REVOKE EXECUTE ON FUNCTION public.is_global_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_client_access(uuid, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_global_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.has_client_access(uuid, text[]) TO service_role;