GRANT EXECUTE ON FUNCTION public.is_global_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_client_access(uuid, text[]) TO authenticated;