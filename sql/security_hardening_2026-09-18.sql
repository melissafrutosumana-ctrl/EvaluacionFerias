-- Endurecimiento de autorizacion y RLS para EvaluacionesCTPM.
-- Aplicar despues de las migraciones base y de judge_evaluation_drafts.
-- Todas las funciones son idempotentes y fallan cerrado ante entradas invalidas.

BEGIN;

-- Las escrituras de jueces solo pueden afectar proyectos que les fueron asignados.
CREATE OR REPLACE FUNCTION public.save_evaluation(
  p_session_token TEXT,
  p_proyecto_id BIGINT,
  p_criterio TEXT,
  p_nota NUMERIC,
  p_tipo_evaluacion TEXT DEFAULT 'Exposición'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id BIGINT;
  v_role TEXT;
  v_tipo TEXT := NULLIF(btrim(p_tipo_evaluacion), '');
  v_criterio TEXT := NULLIF(btrim(p_criterio), '');
BEGIN
  SELECT s.user_id, s.role_name
    INTO v_user_id, v_role
    FROM public.app_sessions s
   WHERE s.session_id = p_session_token
     AND s.expires_at > now();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Invalid session';
  END IF;
  IF v_role NOT IN ('Juez', 'administrador') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_proyecto_id IS NULL OR v_tipo IS NULL OR v_criterio IS NULL
     OR length(v_criterio) > 500 OR p_nota IS NULL
     OR p_nota < 0 OR p_nota > 10 THEN
    RAISE EXCEPTION 'Invalid evaluation data';
  END IF;

  IF v_role = 'Juez' AND NOT EXISTS (
    SELECT 1
      FROM public.asignaciones_jueces a
     WHERE a.juez_id = v_user_id
       AND a.proyecto_id = p_proyecto_id
       AND COALESCE(a.tipo_evaluacion, 'Exposición') = v_tipo
  ) THEN
    RAISE EXCEPTION 'Project is not assigned to this judge';
  END IF;

  INSERT INTO public.evaluaciones_proyectos
    (proyecto_id, juez_id, criterio, nota, tipo_evaluacion)
  VALUES (p_proyecto_id, v_user_id, v_criterio, p_nota, v_tipo)
  ON CONFLICT (proyecto_id, juez_id, tipo_evaluacion, criterio)
  DO UPDATE SET nota = EXCLUDED.nota;
END;
$function$;

CREATE OR REPLACE FUNCTION public.save_observation(
  p_session_token TEXT,
  p_proyecto_id BIGINT,
  p_tipo_evaluacion TEXT,
  p_texto TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id BIGINT;
  v_role TEXT;
  v_tipo TEXT := NULLIF(btrim(p_tipo_evaluacion), '');
  v_texto TEXT := COALESCE(p_texto, '');
BEGIN
  SELECT s.user_id, s.role_name
    INTO v_user_id, v_role
    FROM public.app_sessions s
   WHERE s.session_id = p_session_token
     AND s.expires_at > now();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Invalid session';
  END IF;
  IF v_role NOT IN ('Juez', 'administrador') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_proyecto_id IS NULL OR v_tipo IS NULL OR length(v_texto) > 5000 THEN
    RAISE EXCEPTION 'Invalid observation data';
  END IF;

  IF v_role = 'Juez' AND NOT EXISTS (
    SELECT 1
      FROM public.asignaciones_jueces a
     WHERE a.juez_id = v_user_id
       AND a.proyecto_id = p_proyecto_id
       AND COALESCE(a.tipo_evaluacion, 'Exposición') = v_tipo
  ) THEN
    RAISE EXCEPTION 'Project is not assigned to this judge';
  END IF;

  INSERT INTO public.observaciones_proyectos
    (proyecto_id, juez_id, tipo_evaluacion, texto)
  VALUES (p_proyecto_id, v_user_id, v_tipo, v_texto)
  ON CONFLICT (proyecto_id, juez_id, tipo_evaluacion)
  DO UPDATE SET texto = EXCLUDED.texto, updated_at = now();
END;
$function$;

-- Valida toda la carga antes de reemplazar las asignaciones del juez.
CREATE OR REPLACE FUNCTION public.admin_save_assignments(
  p_session_token TEXT,
  p_juez_id BIGINT,
  p_assignments JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_role TEXT;
  v_count INTEGER;
BEGIN
  SELECT s.role_name
    INTO v_role
    FROM public.app_sessions s
   WHERE s.session_id = p_session_token
     AND s.expires_at > now();
  IF v_role <> 'administrador' THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  IF p_juez_id IS NULL OR jsonb_typeof(p_assignments) <> 'array' THEN
    RAISE EXCEPTION 'Invalid assignments';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = p_juez_id AND lower(trim(r.nombre)) = 'juez'
  ) THEN
    RAISE EXCEPTION 'Target user is not a judge';
  END IF;

  SELECT count(*) INTO v_count FROM jsonb_array_elements(p_assignments);
  IF v_count > 2 THEN
    RAISE EXCEPTION 'A judge cannot receive more than two assignments';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_assignments) a
     WHERE (a->>'proyecto_id') IS NULL
        OR (a->>'proyecto_id') !~ '^[0-9]+$'
        OR COALESCE(a->>'tipo_evaluacion', 'Exposición') NOT IN ('Exposición', 'Escrito')
        OR NOT EXISTS (
          SELECT 1 FROM public.proyectos_ferias p
           WHERE p.id = (a->>'proyecto_id')::BIGINT
        )
  ) THEN
    RAISE EXCEPTION 'Invalid project assignment';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_assignments) a
     GROUP BY (a->>'proyecto_id')::BIGINT, COALESCE(a->>'tipo_evaluacion', 'Exposición')
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate project assignment';
  END IF;

  DELETE FROM public.asignaciones_jueces WHERE juez_id = p_juez_id;
  INSERT INTO public.asignaciones_jueces (juez_id, proyecto_id, tipo_evaluacion)
  SELECT p_juez_id, (a->>'proyecto_id')::BIGINT,
         COALESCE(a->>'tipo_evaluacion', 'Exposición')
    FROM jsonb_array_elements(p_assignments) a;
END;
$function$;

-- Defensa contra cambios de search_path en todas las funciones SECURITY DEFINER.
DO $block$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS signature
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prosecdef
       AND p.proname IN (
         'admin_delete_project', 'admin_delete_user', 'admin_insert_user',
         'admin_save_project', 'admin_save_assignments', 'admin_set_manual_escrito',
         'admin_update_user', 'save_evaluation', 'save_observation',
         'delete_evaluation', 'restore_session',
         'logout_session'
       )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', f.signature);
  END LOOP;
END;
$block$;

ALTER FUNCTION public.authenticate_user(text, text)
  SET search_path = public, extensions;

-- No hay acceso directo a tablas sensibles; una politica SELECT publica seria
-- una defensa debil si los privilegios se restauran accidentalmente.
DROP POLICY IF EXISTS asignaciones_jueces_select_public ON public.asignaciones_jueces;
DROP POLICY IF EXISTS evaluaciones_proyectos_select_public ON public.evaluaciones_proyectos;
DROP POLICY IF EXISTS observaciones_proyectos_select_public ON public.observaciones_proyectos;
DROP POLICY IF EXISTS proyectos_ferias_select_public ON public.proyectos_ferias;
DROP POLICY IF EXISTS usuarios_select_public ON public.usuarios;
DROP POLICY IF EXISTS roles_select_public ON public.roles;

REVOKE ALL ON TABLE public.app_sessions, public.login_attempts,
  public.judge_evaluation_drafts, public.usuarios, public.proyectos_ferias,
  public.asignaciones_jueces, public.evaluaciones_proyectos,
  public.observaciones_proyectos, public.roles
  FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.cleanup_expired_sessions() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_expired_judge_evaluation_drafts() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_app_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_app_user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_expired_sessions() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_expired_judge_evaluation_drafts() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.current_app_user_id() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.current_app_user_role() FROM anon, authenticated;

COMMIT;
