-- Fecha opcional de evaluación por proyecto.
-- Ejecutar este script una vez en el SQL Editor de Supabase.

ALTER TABLE public.proyectos_ferias
  ADD COLUMN IF NOT EXISTS fecha_evaluacion DATE;

CREATE INDEX IF NOT EXISTS idx_proyectos_ferias_fecha_evaluacion
  ON public.proyectos_ferias (fecha_evaluacion);

-- PostgreSQL no permite cambiar el tipo de retorno con CREATE OR REPLACE.
-- Se recrean las RPC porque ahora incluyen fecha_evaluacion.
DROP FUNCTION IF EXISTS public.admin_save_project(TEXT, JSONB);
DROP FUNCTION IF EXISTS public.get_judge_projects(TEXT);

-- Guarda proyectos nuevos y existentes, incluida la fecha de evaluación.
CREATE OR REPLACE FUNCTION public.admin_save_project(
  p_session_token TEXT,
  p_data JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_role TEXT;
  v_project_id BIGINT;
BEGIN
  SELECT role_name
  INTO v_role
  FROM public.app_sessions
  WHERE session_id = p_session_token
    AND expires_at > now();

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Invalid session';
  END IF;
  IF v_role <> 'administrador' THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  IF NULLIF(p_data->>'id', '') IS NULL THEN
    INSERT INTO public.proyectos_ferias (
      titulo, descripcion, tipo_feria, nivel_educativo,
      integrante_1, integrante_2, integrante_3,
      categoria_festival, subcategoria_festival, participacion,
      categoria_expotecnica, eje_tematico, categoria_pronatecyt,
      fecha_evaluacion
    ) VALUES (
      NULLIF(btrim(p_data->>'titulo'), ''),
      NULLIF(btrim(p_data->>'descripcion'), ''),
      NULLIF(btrim(p_data->>'tipo_feria'), ''),
      NULLIF(btrim(p_data->>'nivel_educativo'), ''),
      NULLIF(btrim(p_data->>'integrante_1'), ''),
      NULLIF(btrim(p_data->>'integrante_2'), ''),
      NULLIF(btrim(p_data->>'integrante_3'), ''),
      NULLIF(btrim(p_data->>'categoria_festival'), ''),
      NULLIF(btrim(p_data->>'subcategoria_festival'), ''),
      NULLIF(btrim(p_data->>'participacion'), ''),
      NULLIF(btrim(p_data->>'categoria_expotecnica'), ''),
      NULLIF(btrim(p_data->>'eje_tematico'), ''),
      NULLIF(btrim(p_data->>'categoria_pronatecyt'), ''),
      NULLIF(p_data->>'fecha_evaluacion', '')::DATE
    );
    RETURN;
  END IF;

  v_project_id := (p_data->>'id')::BIGINT;

  UPDATE public.proyectos_ferias
  SET titulo = NULLIF(btrim(p_data->>'titulo'), ''),
      descripcion = NULLIF(btrim(p_data->>'descripcion'), ''),
      tipo_feria = NULLIF(btrim(p_data->>'tipo_feria'), ''),
      nivel_educativo = NULLIF(btrim(p_data->>'nivel_educativo'), ''),
      integrante_1 = NULLIF(btrim(p_data->>'integrante_1'), ''),
      integrante_2 = NULLIF(btrim(p_data->>'integrante_2'), ''),
      integrante_3 = NULLIF(btrim(p_data->>'integrante_3'), ''),
      categoria_festival = NULLIF(btrim(p_data->>'categoria_festival'), ''),
      subcategoria_festival = NULLIF(btrim(p_data->>'subcategoria_festival'), ''),
      participacion = NULLIF(btrim(p_data->>'participacion'), ''),
      categoria_expotecnica = NULLIF(btrim(p_data->>'categoria_expotecnica'), ''),
      eje_tematico = NULLIF(btrim(p_data->>'eje_tematico'), ''),
      categoria_pronatecyt = NULLIF(btrim(p_data->>'categoria_pronatecyt'), ''),
      fecha_evaluacion = NULLIF(p_data->>'fecha_evaluacion', '')::DATE
  WHERE id = v_project_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_save_project(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_save_project(TEXT, JSONB) TO anon, authenticated;

-- Devuelve al juez solo sus proyectos asignados, con su fecha de evaluación.
CREATE OR REPLACE FUNCTION public.get_judge_projects(p_session_token TEXT)
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
  SELECT
    p.id, p.titulo, p.tipo_feria, a.tipo_evaluacion,
    p.categoria_festival, p.subcategoria_festival,
    p.categoria_expotecnica, p.eje_tematico, p.categoria_pronatecyt,
    p.fecha_evaluacion
  FROM public.asignaciones_jueces a
  JOIN public.proyectos_ferias p ON p.id = a.proyecto_id
  WHERE a.juez_id = v_user_id
  ORDER BY p.fecha_evaluacion NULLS LAST, p.titulo ASC, p.id ASC;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_judge_projects(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_judge_projects(TEXT) TO anon, authenticated;
