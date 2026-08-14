-- Seguridad: 2026-08-13
-- 1. CRITICA: migrate_user_password era SECURITY DEFINER ejecutable por anon
--    -> toma de control de cualquier cuenta (login como admin con clave propia).
--    No se usa (reemplazada por migracion lazy en authenticate_user). Se revoca todo acceso.
-- 2. ALTA: login_attempts tenia RLS deshabilitado y grants a anon
--    -> anon podia insertar/borrar intentos (DoS de login o bypass de rate limiting).
--    El rate limiting va por RPCs SECURITY DEFINER (record_failed_attempt/is_locked_out), que corren como owner, asi que siguen funcionando.

REVOKE ALL ON FUNCTION public.migrate_user_password FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.migrate_user_password FROM anon, authenticated;

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.login_attempts FROM anon, authenticated;
