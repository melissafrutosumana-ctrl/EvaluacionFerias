-- Endurecimiento posterior a las migraciones iniciales.
-- Aplicar después de fix_security_critical.sql, rate_limiting.sql y
-- read_rpc_security_2026-08-13.sql. Es idempotente y no elimina migraciones históricas.

-- SECURITY DEFINER nunca debe resolver objetos mediante el search_path del cliente.
DO $block$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT * FROM (VALUES
      ('public', 'get_projects(text)', 'public'),
      ('public', 'get_project(text,bigint)', 'public'),
      ('public', 'get_users(text)', 'public'),
      ('public', 'get_roles(text)', 'public'),
      ('public', 'get_assignments(text)', 'public'),
      ('public', 'get_evaluations(text)', 'public'),
      ('public', 'get_observations(text)', 'public'),
      ('public', 'get_judge_projects(text)', 'public'),
      ('public', 'get_judge_evaluations(text,bigint,text)', 'public'),
      ('public', 'get_judge_observation(text,bigint,text)', 'public'),
      ('public', 'get_judge_evaluations_with_titles(text)', 'public'),
      ('public', 'admin_save_project(text,jsonb)', 'public'),
      ('public', 'record_failed_attempt(text)', 'public'),
      ('public', 'is_locked_out(text)', 'public'),
      ('public', 'authenticate_user(text,text)', 'public, extensions'),
      ('public', 'migrate_user_password(bigint,text)', 'public, extensions'),
      ('public', 'restore_session(text)', 'public'),
      ('public', 'logout_session(text)', 'public'),
      ('public', 'cleanup_expired_sessions()', 'public')
    ) AS x(schema_name, signature, path)
  LOOP
    IF to_regprocedure(f.schema_name || '.' || f.signature) IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = %s',
        f.schema_name || '.' || f.signature, f.path);
    END IF;
  END LOOP;
END;
$block$;

-- Solo authenticate_user debe ser invocable por el cliente.
REVOKE ALL ON FUNCTION public.migrate_user_password(bigint, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_failed_attempt(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_locked_out(text) FROM PUBLIC;

-- La tabla de rate limiting solo se manipula desde las funciones anteriores.
ALTER TABLE IF EXISTS public.login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.login_attempts FROM anon, authenticated;
