-- Persistent per-day coalescing queue for automatic PDF archive refreshes.
-- Apply this migration before deploying code that calls these RPCs.

ALTER TABLE public.admin_results_pdf_archives
  ADD COLUMN IF NOT EXISTS source_generation BIGINT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.daily_results_pdf_archive_jobs (
  evaluation_date DATE PRIMARY KEY,
  source_project_id BIGINT NOT NULL,
  requested_generation BIGINT NOT NULL DEFAULT 0 CHECK (requested_generation >= 0),
  processed_generation BIGINT NOT NULL DEFAULT 0 CHECK (processed_generation >= 0),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  lease_token UUID,
  lease_until TIMESTAMPTZ,
  CHECK ((lease_token IS NULL) = (lease_until IS NULL))
);

ALTER TABLE public.daily_results_pdf_archive_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.daily_results_pdf_archive_jobs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_results_pdf_archive_jobs TO service_role;

CREATE OR REPLACE FUNCTION public.mark_daily_results_pdf_archive_dirty()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_project_id BIGINT;
  v_evaluation_date DATE;
BEGIN
  IF TG_TABLE_NAME = 'evaluaciones_proyectos' THEN
    v_project_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.proyecto_id ELSE NEW.proyecto_id END;
  ELSE
    v_project_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
  END IF;

  SELECT COALESCE(
    p.fecha_evaluacion,
    (clock_timestamp() AT TIME ZONE 'America/Costa_Rica')::DATE
  )
  INTO v_evaluation_date
  FROM public.proyectos_ferias AS p
  WHERE p.id = v_project_id;

  IF v_evaluation_date IS NOT NULL THEN
    INSERT INTO public.daily_results_pdf_archive_jobs AS current_job (
      evaluation_date, source_project_id, requested_generation, processed_generation, requested_at
    )
    VALUES (v_evaluation_date, v_project_id, 1, 0, clock_timestamp())
    ON CONFLICT (evaluation_date) DO UPDATE
    SET source_project_id = EXCLUDED.source_project_id,
        requested_generation = current_job.requested_generation + 1,
        requested_at = clock_timestamp();
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS evaluations_dirty_daily_results_pdf ON public.evaluaciones_proyectos;
CREATE TRIGGER evaluations_dirty_daily_results_pdf
AFTER INSERT OR UPDATE OR DELETE ON public.evaluaciones_proyectos
FOR EACH ROW EXECUTE FUNCTION public.mark_daily_results_pdf_archive_dirty();

DROP TRIGGER IF EXISTS manual_score_dirty_daily_results_pdf ON public.proyectos_ferias;
CREATE TRIGGER manual_score_dirty_daily_results_pdf
AFTER UPDATE OF puntaje_escrito_manual ON public.proyectos_ferias
FOR EACH ROW
WHEN (OLD.puntaje_escrito_manual IS DISTINCT FROM NEW.puntaje_escrito_manual)
EXECUTE FUNCTION public.mark_daily_results_pdf_archive_dirty();

REVOKE ALL ON FUNCTION public.mark_daily_results_pdf_archive_dirty() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_daily_results_pdf_archive_dirty() TO service_role;

CREATE OR REPLACE FUNCTION public.enqueue_daily_results_pdf_archive(
  p_session_token TEXT,
  p_source_project_id BIGINT
)
RETURNS TABLE(evaluation_date DATE, requested_generation BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id BIGINT;
  v_role TEXT;
  v_project_date DATE;
  v_evaluation_date DATE;
BEGIN
  SELECT s.user_id, lower(btrim(s.role_name))
  INTO v_user_id, v_role
  FROM public.app_sessions AS s
  WHERE s.session_id = p_session_token AND s.expires_at > clock_timestamp();
  IF v_user_id IS NULL OR v_role NOT IN ('administrador', 'juez') THEN
    RAISE EXCEPTION 'Sesión o rol no válido';
  END IF;

  SELECT p.fecha_evaluacion INTO v_project_date
  FROM public.proyectos_ferias AS p
  WHERE p.id = p_source_project_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'El proyecto no existe'; END IF;

  IF v_role = 'juez' AND NOT EXISTS (
    SELECT 1 FROM public.asignaciones_jueces AS a
    WHERE a.juez_id = v_user_id AND a.proyecto_id = p_source_project_id
  ) THEN
    RAISE EXCEPTION 'El juez no tiene asignado ese proyecto';
  END IF;

  v_evaluation_date := COALESCE(v_project_date, (clock_timestamp() AT TIME ZONE 'America/Costa_Rica')::DATE);
  RETURN QUERY
  INSERT INTO public.daily_results_pdf_archive_jobs AS current_job (
    evaluation_date, source_project_id, requested_generation, processed_generation, requested_at
  )
  VALUES (v_evaluation_date, p_source_project_id, 1, 0, clock_timestamp())
  ON CONFLICT (evaluation_date) DO UPDATE
  SET source_project_id = EXCLUDED.source_project_id,
      requested_generation = current_job.requested_generation + 1,
      requested_at = clock_timestamp()
  RETURNING current_job.evaluation_date, current_job.requested_generation;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_daily_results_pdf_archive(
  p_session_token TEXT,
  p_evaluation_date DATE
)
RETURNS TABLE(
  evaluation_date DATE,
  source_project_id BIGINT,
  requested_generation BIGINT,
  lease_token UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT lower(btrim(s.role_name)) INTO v_role
  FROM public.app_sessions AS s
  WHERE s.session_id = p_session_token AND s.expires_at > clock_timestamp();
  IF v_role NOT IN ('administrador', 'juez') THEN RAISE EXCEPTION 'Sesión o rol no válido'; END IF;

  RETURN QUERY
  UPDATE public.daily_results_pdf_archive_jobs AS job
  SET lease_token = gen_random_uuid(), lease_until = clock_timestamp() + INTERVAL '2 minutes'
  WHERE job.evaluation_date = p_evaluation_date
    AND job.requested_generation > job.processed_generation
    AND job.requested_at <= clock_timestamp() - INTERVAL '500 milliseconds'
    AND (job.lease_token IS NULL OR job.lease_until <= clock_timestamp())
  RETURNING job.evaluation_date, job.source_project_id, job.requested_generation, job.lease_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_daily_results_pdf_archive(
  p_session_token TEXT,
  p_evaluation_date DATE,
  p_lease_token UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT lower(btrim(s.role_name)) INTO v_role
  FROM public.app_sessions AS s
  WHERE s.session_id = p_session_token AND s.expires_at > clock_timestamp();
  IF v_role NOT IN ('administrador', 'juez') THEN RAISE EXCEPTION 'Sesión o rol no válido'; END IF;

  UPDATE public.daily_results_pdf_archive_jobs
  SET lease_token = NULL, lease_until = NULL
  WHERE evaluation_date = p_evaluation_date AND lease_token = p_lease_token;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.renew_daily_results_pdf_archive(
  p_session_token TEXT,
  p_evaluation_date DATE,
  p_requested_generation BIGINT,
  p_lease_token UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT lower(btrim(s.role_name)) INTO v_role
  FROM public.app_sessions AS s
  WHERE s.session_id = p_session_token AND s.expires_at > clock_timestamp();
  IF v_role NOT IN ('administrador', 'juez') THEN RAISE EXCEPTION 'Sesión o rol no válido'; END IF;

  UPDATE public.daily_results_pdf_archive_jobs
  SET lease_until = clock_timestamp() + INTERVAL '2 minutes'
  WHERE evaluation_date = p_evaluation_date
    AND lease_token = p_lease_token;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_daily_results_pdf_archive(
  p_session_token TEXT,
  p_evaluation_date DATE,
  p_source_project_id BIGINT,
  p_requested_generation BIGINT,
  p_lease_token UUID,
  p_feria TEXT,
  p_project_count INTEGER,
  p_file_name TEXT,
  p_pdf_base64 TEXT,
  p_generated_at TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id BIGINT;
  v_role TEXT;
  v_project_date DATE;
  v_pdf BYTEA;
  v_job public.daily_results_pdf_archive_jobs%ROWTYPE;
  v_archive_key TEXT;
BEGIN
  SELECT s.user_id, lower(btrim(s.role_name))
  INTO v_user_id, v_role
  FROM public.app_sessions AS s
  WHERE s.session_id = p_session_token AND s.expires_at > clock_timestamp();
  IF v_user_id IS NULL OR v_role NOT IN ('administrador', 'juez') THEN
    RAISE EXCEPTION 'Sesión o rol no válido';
  END IF;

  SELECT p.fecha_evaluacion INTO v_project_date
  FROM public.proyectos_ferias AS p
  WHERE p.id = p_source_project_id;
  IF NOT FOUND OR COALESCE(v_project_date, p_evaluation_date) <> p_evaluation_date THEN
    RAISE EXCEPTION 'El proyecto no corresponde al día del archivo';
  END IF;
  IF p_project_count < 0 OR btrim(COALESCE(p_feria, '')) = ''
    OR p_file_name !~ '^[A-Za-z0-9._-]+\.pdf$'
    OR length(COALESCE(p_pdf_base64, '')) > 4000000
    OR p_generated_at > clock_timestamp() + INTERVAL '5 minutes' THEN
    RAISE EXCEPTION 'Los datos del PDF diario no son válidos';
  END IF;
  BEGIN
    v_pdf := decode(p_pdf_base64, 'base64');
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'El PDF diario está codificado de forma inválida';
  END;
  IF octet_length(v_pdf) = 0 OR substring(v_pdf FROM 1 FOR 5) <> convert_to('%PDF-', 'UTF8') THEN
    RAISE EXCEPTION 'El contenido del archivo no es un PDF válido';
  END IF;

  SELECT * INTO v_job
  FROM public.daily_results_pdf_archive_jobs AS job
  WHERE job.evaluation_date = p_evaluation_date
  FOR UPDATE;
  IF NOT FOUND OR v_job.lease_token IS DISTINCT FROM p_lease_token
    OR v_job.lease_until <= clock_timestamp() THEN
    RETURN FALSE;
  END IF;
  IF v_job.requested_generation <> p_requested_generation THEN
    UPDATE public.daily_results_pdf_archive_jobs
    SET lease_token = NULL, lease_until = NULL
    WHERE evaluation_date = p_evaluation_date AND lease_token = p_lease_token;
    RETURN FALSE;
  END IF;

  v_archive_key := to_char(p_evaluation_date, 'YYYY-MM-DD') || '|' || btrim(p_feria);
  INSERT INTO public.admin_results_pdf_archives AS existing (
    evaluation_date, feria, project_count, file_name, pdf_data, archive_key, generated_at, source_generation
  )
  VALUES (p_evaluation_date, btrim(p_feria), p_project_count, p_file_name, v_pdf, v_archive_key, p_generated_at, p_requested_generation)
  ON CONFLICT (archive_key) DO UPDATE
  SET evaluation_date = EXCLUDED.evaluation_date,
      feria = EXCLUDED.feria,
      project_count = EXCLUDED.project_count,
      file_name = EXCLUDED.file_name,
      pdf_data = EXCLUDED.pdf_data,
      generated_at = GREATEST(existing.generated_at, EXCLUDED.generated_at),
      source_generation = EXCLUDED.source_generation
  WHERE existing.source_generation < EXCLUDED.source_generation;

  UPDATE public.daily_results_pdf_archive_jobs
  SET processed_generation = p_requested_generation,
      lease_token = NULL,
      lease_until = NULL
  WHERE evaluation_date = p_evaluation_date AND lease_token = p_lease_token;
  RETURN TRUE;
END;
$$;

-- Keep old Vercel instances working during the SQL-to-code roll-forward. They
-- can persist only when their build started after the latest durable request.
CREATE OR REPLACE FUNCTION public.save_automatic_daily_results_pdf_archive(
  p_session_token TEXT,
  p_source_project_id BIGINT,
  p_evaluation_date DATE,
  p_feria TEXT,
  p_project_count INTEGER,
  p_file_name TEXT,
  p_pdf_base64 TEXT,
  p_generated_at TIMESTAMPTZ
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id BIGINT;
  v_role TEXT;
  v_project_date DATE;
  v_job public.daily_results_pdf_archive_jobs%ROWTYPE;
  v_lease_token UUID;
  v_saved BOOLEAN;
  v_archive_id BIGINT;
BEGIN
  SELECT s.user_id, lower(btrim(s.role_name))
  INTO v_user_id, v_role
  FROM public.app_sessions AS s
  WHERE s.session_id = p_session_token AND s.expires_at > clock_timestamp();
  IF v_user_id IS NULL OR v_role NOT IN ('administrador', 'juez') THEN
    RAISE EXCEPTION 'Sesión o rol no válido';
  END IF;

  SELECT p.fecha_evaluacion INTO v_project_date
  FROM public.proyectos_ferias AS p
  WHERE p.id = p_source_project_id;
  IF NOT FOUND OR COALESCE(v_project_date, p_evaluation_date) <> p_evaluation_date THEN
    RAISE EXCEPTION 'El proyecto no corresponde al día del archivo';
  END IF;
  IF v_role = 'juez' AND NOT EXISTS (
    SELECT 1 FROM public.asignaciones_jueces AS a
    WHERE a.juez_id = v_user_id AND a.proyecto_id = p_source_project_id
  ) THEN
    RAISE EXCEPTION 'El juez no tiene asignado ese proyecto';
  END IF;

  SELECT * INTO v_job
  FROM public.daily_results_pdf_archive_jobs AS job
  WHERE job.evaluation_date = p_evaluation_date
  FOR UPDATE;
  IF NOT FOUND OR v_job.requested_generation <= v_job.processed_generation
    OR p_generated_at < v_job.requested_at
    OR (v_job.lease_token IS NOT NULL AND v_job.lease_until > clock_timestamp()) THEN
    RETURN NULL;
  END IF;

  v_lease_token := gen_random_uuid();
  UPDATE public.daily_results_pdf_archive_jobs
  SET lease_token = v_lease_token, lease_until = clock_timestamp() + INTERVAL '2 minutes'
  WHERE evaluation_date = p_evaluation_date;

  v_saved := public.complete_daily_results_pdf_archive(
    p_session_token,
    p_evaluation_date,
    p_source_project_id,
    v_job.requested_generation,
    v_lease_token,
    p_feria,
    p_project_count,
    p_file_name,
    p_pdf_base64,
    p_generated_at
  );
  IF NOT v_saved THEN RETURN NULL; END IF;

  SELECT a.id INTO v_archive_id
  FROM public.admin_results_pdf_archives AS a
  WHERE a.archive_key = to_char(p_evaluation_date, 'YYYY-MM-DD') || '|' || btrim(p_feria);
  RETURN v_archive_id;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_daily_results_pdf_archive(TEXT, BIGINT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_daily_results_pdf_archive(TEXT, DATE) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_daily_results_pdf_archive(TEXT, DATE, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.renew_daily_results_pdf_archive(TEXT, DATE, BIGINT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_daily_results_pdf_archive(TEXT, DATE, BIGINT, BIGINT, UUID, TEXT, INTEGER, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_daily_results_pdf_archive(TEXT, BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_daily_results_pdf_archive(TEXT, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_daily_results_pdf_archive(TEXT, DATE, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.renew_daily_results_pdf_archive(TEXT, DATE, BIGINT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_daily_results_pdf_archive(TEXT, DATE, BIGINT, BIGINT, UUID, TEXT, INTEGER, TEXT, TEXT, TIMESTAMPTZ) TO service_role;

NOTIFY pgrst, 'reload schema';

-- Internal read path for the worker. Keep all source tables behind a single
-- service_role-only RPC instead of exposing the tables through PostgREST.
CREATE OR REPLACE FUNCTION public.get_daily_results_pdf_snapshot(
  p_session_token TEXT,
  p_evaluation_date DATE,
  p_offset INTEGER,
  p_limit INTEGER
)
RETURNS TABLE(record_type TEXT, row_id BIGINT, row_data JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id BIGINT;
  v_role TEXT;
  v_today DATE := (clock_timestamp() AT TIME ZONE 'America/Costa_Rica')::DATE;
BEGIN
  SELECT s.user_id, lower(btrim(s.role_name))
  INTO v_user_id, v_role
  FROM public.app_sessions AS s
  WHERE s.session_id = p_session_token AND s.expires_at > clock_timestamp();
  IF v_user_id IS NULL OR v_role NOT IN ('administrador', 'juez') THEN
    RAISE EXCEPTION 'Sesión o rol no válido';
  END IF;
  IF p_evaluation_date IS NULL OR p_offset < 0 OR p_limit < 1 OR p_limit > 500 THEN
    RAISE EXCEPTION 'Parámetros de paginación no válidos';
  END IF;
  IF v_role = 'juez' AND NOT EXISTS (
    SELECT 1
    FROM public.asignaciones_jueces AS a
    JOIN public.proyectos_ferias AS p ON p.id = a.proyecto_id
    WHERE a.juez_id = v_user_id
      AND (p.fecha_evaluacion = p_evaluation_date
        OR (p.fecha_evaluacion IS NULL AND p_evaluation_date = v_today))
  ) THEN
    RAISE EXCEPTION 'El juez no tiene proyectos asignados para ese día';
  END IF;

  RETURN QUERY
  WITH day_projects AS (
    SELECT p.*
    FROM public.proyectos_ferias AS p
    WHERE p.fecha_evaluacion = p_evaluation_date
      OR (p.fecha_evaluacion IS NULL AND p_evaluation_date = v_today)
  ),
  snapshot_rows AS (
    SELECT 'project'::TEXT AS kind, p.id AS id, jsonb_build_object(
      'id', p.id,
      'titulo', p.titulo,
      'tipo_feria', p.tipo_feria,
      'categoria_pronatecyt', p.categoria_pronatecyt,
      'categoria_expotecnica', p.categoria_expotecnica,
      'categoria_festival', p.categoria_festival,
      'puntaje_escrito_manual', p.puntaje_escrito_manual
    ) AS data
    FROM day_projects AS p
    UNION ALL
    SELECT 'assignment'::TEXT, a.id, jsonb_build_object(
      'id', a.id,
      'proyecto_id', a.proyecto_id,
      'juez_id', a.juez_id,
      'tipo_evaluacion', a.tipo_evaluacion
    )
    FROM public.asignaciones_jueces AS a
    JOIN day_projects AS p ON p.id = a.proyecto_id
    UNION ALL
    SELECT 'evaluation'::TEXT, e.id, jsonb_build_object(
      'id', e.id,
      'proyecto_id', e.proyecto_id,
      'juez_id', e.juez_id,
      'nota', e.nota,
      'tipo_evaluacion', e.tipo_evaluacion
    )
    FROM public.evaluaciones_proyectos AS e
    JOIN day_projects AS p ON p.id = e.proyecto_id
  )
  SELECT snapshot_rows.kind, snapshot_rows.id, snapshot_rows.data
  FROM snapshot_rows
  ORDER BY snapshot_rows.kind, snapshot_rows.id
  OFFSET p_offset
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.get_daily_results_pdf_snapshot(TEXT, DATE, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_results_pdf_snapshot(TEXT, DATE, INTEGER, INTEGER)
  TO service_role;

NOTIFY pgrst, 'reload schema';
