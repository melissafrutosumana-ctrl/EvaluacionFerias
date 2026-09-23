-- Apply after prepare_private_login_rate_limit.sql and lock_down_public_login.sql
-- in the production Evaluaciones project. Fixes mutable search paths without
-- changing RPC permissions, and restricts direct calls to a trigger-only helper.
BEGIN;

ALTER FUNCTION public.validar_asignaciones_jueces()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.set_updated_at()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.cleanup_sessions_on_insert()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.current_app_user_id()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.current_app_user_role()
  SET search_path = pg_catalog, public;

-- This SECURITY DEFINER function is used only as a trigger; callers should
-- not be able to invoke it directly through PostgREST.
REVOKE EXECUTE ON FUNCTION public.reset_empty_id_sequence()
  FROM PUBLIC, anon, authenticated;

COMMIT;
