-- EvaluacionesCTPM - endurecimiento y correcciones de seguridad
-- Pegar completo en Supabase SQL Editor.
-- Requiere que las tablas y RPC principales ya existan.

BEGIN;

-- Evita que funciones SECURITY DEFINER resuelvan objetos mediante el search_path del cliente.
DO $block$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT * FROM (VALUES
      ('public', 'authenticate_user(text,text)', 'public, extensions'),
      ('public', 'restore_session(text)', 'public'),
      ('public', 'logout_session(text)', 'public'),
      ('public', 'migrate_user_password(bigint,text)', 'public, extensions'),
      ('public', 'record_failed_attempt(text)', 'public'),
      ('public', 'is_locked_out(text)', 'public'),
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
      ('public', 'cleanup_expired_sessions()', 'public')
    ) AS x(schema_name, signature, path)
  LOOP
    IF to_regprocedure(f.schema_name || '.' || f.signature) IS NOT NULL THEN
      EXECUTE format(
        'ALTER FUNCTION %s SET search_path = %s',
        f.schema_name || '.' || f.signature,
        f.path
      );
    END IF;
  END LOOP;
END;
$block$;

-- La migración de contraseñas nunca debe ser invocable por clientes.
REVOKE ALL ON FUNCTION public.migrate_user_password(bigint, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.migrate_user_password(bigint, text) FROM anon, authenticated;

-- Los helpers solo deben ser llamados internamente por authenticate_user.
REVOKE ALL ON FUNCTION public.record_failed_attempt(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_locked_out(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_failed_attempt(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_locked_out(text) FROM anon, authenticated;

-- Impide leer o modificar directamente los intentos de login desde el cliente.
ALTER TABLE IF EXISTS public.login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.login_attempts FROM anon, authenticated;

-- El frontend usa RPCs; no necesita acceso directo a tablas sensibles.
REVOKE ALL ON TABLE
  public.app_sessions,
  public.asignaciones_jueces,
  public.evaluaciones_proyectos,
  public.login_attempts,
  public.observaciones_proyectos,
  public.proyectos_ferias,
  public.roles,
  public.usuarios
FROM anon, authenticated;

-- Asegura que administradores no queden ligados a una feria.
ALTER TABLE IF EXISTS public.usuarios ALTER COLUMN tipo_feria DROP NOT NULL;

-- La columna es idempotente para instalaciones que aún no aplicaron esta mejora.
ALTER TABLE IF EXISTS public.proyectos_ferias
  ADD COLUMN IF NOT EXISTS fecha_evaluacion DATE;

-- Firma vigente de la RPC para jueces.
-- Se elimina primero porque PostgreSQL no permite cambiar el tipo de retorno con
-- CREATE OR REPLACE FUNCTION.
DROP FUNCTION IF EXISTS public.get_judge_projects(text);

CREATE FUNCTION public.get_judge_projects(p_session_token TEXT)
RETURNS TABLE(
  id BIGINT,
  titulo TEXT,
  tipo_feria TEXT,
  tipo_evaluacion TEXT,
  categoria_festival TEXT,
  subcategoria_festival TEXT,
  categoria_expotecnica TEXT,
  eje_tematico TEXT,
  categoria_pronatecyt TEXT,
  fecha_evaluacion DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id BIGINT;
BEGIN
  SELECT user_id
    INTO v_user_id
    FROM public.app_sessions
   WHERE session_id = p_session_token
     AND expires_at > now();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Invalid session';
  END IF;

  RETURN QUERY
  SELECT p.id, p.titulo, p.tipo_feria, a.tipo_evaluacion,
         p.categoria_festival, p.subcategoria_festival,
         p.categoria_expotecnica, p.eje_tematico,
         p.categoria_pronatecyt, p.fecha_evaluacion
    FROM public.asignaciones_jueces a
    JOIN public.proyectos_ferias p ON p.id = a.proyecto_id
   WHERE a.juez_id = v_user_id
   ORDER BY p.fecha_evaluacion NULLS LAST, p.titulo ASC, p.id ASC;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_judge_projects(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_judge_projects(text) TO anon, authenticated;

COMMIT;

-- Verificación rápida posterior:
-- SELECT proname, proconfig FROM pg_proc WHERE proname IN
-- ('authenticate_user','restore_session','get_judge_projects');
