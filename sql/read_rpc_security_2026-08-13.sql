-- Lectura por RPCs de sesión (fix 3 - auditoría 2026-08-13)
-- Sigue el mismo patrón que admin_* / save_observation: SECURITY DEFINER
-- + validación de sesión (app_sessions) para que anon no pueda leer tablas.
-- Idempotente (CREATE OR REPLACE).

-- ============ RPCs ADMIN (rol 'administrador') ============

CREATE OR REPLACE FUNCTION public.get_projects(p_session_token text)
RETURNS SETOF public.proyectos_ferias
LANGUAGE plpgsql SECURITY DEFINER
AS $function$
DECLARE v_role TEXT;
BEGIN
  SELECT role_name INTO v_role FROM app_sessions WHERE session_id = p_session_token AND expires_at > now();
  IF v_role IS NULL THEN RAISE EXCEPTION 'Invalid session'; END IF;
  IF v_role != 'administrador' THEN RAISE EXCEPTION 'Admin only'; END IF;
  RETURN QUERY SELECT * FROM proyectos_ferias ORDER BY titulo ASC, id ASC;
END; $function$;

CREATE OR REPLACE FUNCTION public.get_project(p_session_token text, p_project_id bigint)
RETURNS SETOF public.proyectos_ferias
LANGUAGE plpgsql SECURITY DEFINER
AS $function$
DECLARE v_role TEXT;
BEGIN
  SELECT role_name INTO v_role FROM app_sessions WHERE session_id = p_session_token AND expires_at > now();
  IF v_role IS NULL THEN RAISE EXCEPTION 'Invalid session'; END IF;
  IF v_role != 'administrador' THEN RAISE EXCEPTION 'Admin only'; END IF;
  RETURN QUERY SELECT * FROM proyectos_ferias WHERE id = p_project_id;
END; $function$;

CREATE OR REPLACE FUNCTION public.get_users(p_session_token text)
RETURNS TABLE(id bigint, nombre text, role_id bigint, tipo_feria text)
LANGUAGE plpgsql SECURITY DEFINER
AS $function$
DECLARE v_role TEXT;
BEGIN
  SELECT role_name INTO v_role FROM app_sessions WHERE session_id = p_session_token AND expires_at > now();
  IF v_role IS NULL THEN RAISE EXCEPTION 'Invalid session'; END IF;
  IF v_role != 'administrador' THEN RAISE EXCEPTION 'Admin only'; END IF;
  RETURN QUERY SELECT u.id, u.nombre, u.role_id, u.tipo_feria FROM usuarios u ORDER BY u.nombre ASC, u.id ASC;
END; $function$;

CREATE OR REPLACE FUNCTION public.get_roles(p_session_token text)
RETURNS SETOF public.roles
LANGUAGE plpgsql SECURITY DEFINER
AS $function$
DECLARE v_role TEXT;
BEGIN
  SELECT role_name INTO v_role FROM app_sessions WHERE session_id = p_session_token AND expires_at > now();
  IF v_role IS NULL THEN RAISE EXCEPTION 'Invalid session'; END IF;
  IF v_role != 'administrador' THEN RAISE EXCEPTION 'Admin only'; END IF;
  RETURN QUERY SELECT * FROM roles ORDER BY nombre ASC, id ASC;
END; $function$;

CREATE OR REPLACE FUNCTION public.get_assignments(p_session_token text)
RETURNS SETOF public.asignaciones_jueces
LANGUAGE plpgsql SECURITY DEFINER
AS $function$
DECLARE v_role TEXT;
BEGIN
  SELECT role_name INTO v_role FROM app_sessions WHERE session_id = p_session_token AND expires_at > now();
  IF v_role IS NULL THEN RAISE EXCEPTION 'Invalid session'; END IF;
  IF v_role != 'administrador' THEN RAISE EXCEPTION 'Admin only'; END IF;
  RETURN QUERY SELECT * FROM asignaciones_jueces ORDER BY juez_id ASC, created_at ASC, id ASC;
END; $function$;

CREATE OR REPLACE FUNCTION public.get_evaluations(p_session_token text)
RETURNS SETOF public.evaluaciones_proyectos
LANGUAGE plpgsql SECURITY DEFINER
AS $function$
DECLARE v_role TEXT;
BEGIN
  SELECT role_name INTO v_role FROM app_sessions WHERE session_id = p_session_token AND expires_at > now();
  IF v_role IS NULL THEN RAISE EXCEPTION 'Invalid session'; END IF;
  IF v_role != 'administrador' THEN RAISE EXCEPTION 'Admin only'; END IF;
  RETURN QUERY SELECT * FROM evaluaciones_proyectos ORDER BY created_at DESC, id DESC;
END; $function$;

CREATE OR REPLACE FUNCTION public.get_observations(p_session_token text)
RETURNS SETOF public.observaciones_proyectos
LANGUAGE plpgsql SECURITY DEFINER
AS $function$
DECLARE v_role TEXT;
BEGIN
  SELECT role_name INTO v_role FROM app_sessions WHERE session_id = p_session_token AND expires_at > now();
  IF v_role IS NULL THEN RAISE EXCEPTION 'Invalid session'; END IF;
  IF v_role != 'administrador' THEN RAISE EXCEPTION 'Admin only'; END IF;
  RETURN QUERY SELECT * FROM observaciones_proyectos ORDER BY created_at DESC, id DESC;
END; $function$;

-- ============ RPCs JUEZ (solo sus propios datos, user_id desde la sesión) ============

-- Proyectos asignados al juez de la sesión (join asignaciones -> proyectos)
CREATE OR REPLACE FUNCTION public.get_judge_projects(p_session_token text)
RETURNS TABLE(id bigint, titulo text, tipo_feria text, tipo_evaluacion text,
              categoria_festival text, subcategoria_festival text,
              categoria_expotecnica text, eje_tematico text, categoria_pronatecyt text)
LANGUAGE plpgsql SECURITY DEFINER
AS $function$
DECLARE v_user_id BIGINT;
BEGIN
  SELECT user_id INTO v_user_id FROM app_sessions WHERE session_id = p_session_token AND expires_at > now();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Invalid session'; END IF;
  RETURN QUERY
    SELECT p.id, p.titulo, p.tipo_feria, a.tipo_evaluacion,
           p.categoria_festival, p.subcategoria_festival,
           p.categoria_expotecnica, p.eje_tematico, p.categoria_pronatecyt
    FROM asignaciones_jueces a
    JOIN proyectos_ferias p ON p.id = a.proyecto_id
    WHERE a.juez_id = v_user_id
    ORDER BY p.titulo ASC, p.id ASC;
END; $function$;

-- Evaluaciones guardadas del juez para un proyecto/tipo
CREATE OR REPLACE FUNCTION public.get_judge_evaluations(p_session_token text, p_project_id bigint, p_tipo_evaluacion text)
RETURNS TABLE(criterio text, nota numeric)
LANGUAGE plpgsql SECURITY DEFINER
AS $function$
DECLARE v_user_id BIGINT;
BEGIN
  SELECT user_id INTO v_user_id FROM app_sessions WHERE session_id = p_session_token AND expires_at > now();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Invalid session'; END IF;
  RETURN QUERY
    SELECT e.criterio, e.nota FROM evaluaciones_proyectos e
    WHERE e.juez_id = v_user_id AND e.proyecto_id = p_project_id AND e.tipo_evaluacion = p_tipo_evaluacion;
END; $function$;

-- Observación guardada del juez para un proyecto/tipo
CREATE OR REPLACE FUNCTION public.get_judge_observation(p_session_token text, p_project_id bigint, p_tipo_evaluacion text)
RETURNS TABLE(texto text)
LANGUAGE plpgsql SECURITY DEFINER
AS $function$
DECLARE v_user_id BIGINT;
BEGIN
  SELECT user_id INTO v_user_id FROM app_sessions WHERE session_id = p_session_token AND expires_at > now();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Invalid session'; END IF;
  RETURN QUERY
    SELECT o.texto FROM observaciones_proyectos o
    WHERE o.juez_id = v_user_id AND o.proyecto_id = p_project_id AND o.tipo_evaluacion = p_tipo_evaluacion
    LIMIT 1;
END; $function$;

-- Historial completo del juez (con título de proyecto), para progreso y PDF
CREATE OR REPLACE FUNCTION public.get_judge_evaluations_with_titles(p_session_token text)
RETURNS TABLE(id bigint, proyecto_id bigint, criterio text, nota numeric,
              tipo_evaluacion text, titulo text, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER
AS $function$
DECLARE v_user_id BIGINT;
BEGIN
  SELECT user_id INTO v_user_id FROM app_sessions WHERE session_id = p_session_token AND expires_at > now();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Invalid session'; END IF;
  RETURN QUERY
    SELECT e.id, e.proyecto_id, e.criterio, e.nota, e.tipo_evaluacion, p.titulo, e.created_at
    FROM evaluaciones_proyectos e
    LEFT JOIN proyectos_ferias p ON p.id = e.proyecto_id
    WHERE e.juez_id = v_user_id
    ORDER BY e.created_at DESC, e.id DESC;
END; $function$;
