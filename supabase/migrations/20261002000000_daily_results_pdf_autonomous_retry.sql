-- Recuperación autónoma diaria para trabajos cuyo worker de Vercel terminó.
-- Todos los RPC de esta migración son exclusivos de service_role; el endpoint
-- protegido por CRON_SECRET es el único caller previsto.
BEGIN;

CREATE OR REPLACE FUNCTION public.list_pending_daily_results_pdf_archives(p_limit INTEGER DEFAULT 14)
RETURNS TABLE(evaluation_date DATE)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT job.evaluation_date
  FROM public.daily_results_pdf_archive_jobs AS job
  WHERE job.requested_generation > job.processed_generation
    AND (job.lease_token IS NULL OR job.lease_until <= clock_timestamp())
  ORDER BY job.requested_at, job.evaluation_date
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 14), 1), 14);
$$;

CREATE OR REPLACE FUNCTION public.claim_daily_results_pdf_archive_worker(p_evaluation_date DATE)
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
BEGIN
  RETURN QUERY
  UPDATE public.daily_results_pdf_archive_jobs AS job
  SET lease_token = gen_random_uuid(),
      lease_until = clock_timestamp() + INTERVAL '2 minutes'
  WHERE job.evaluation_date = p_evaluation_date
    AND job.requested_generation > job.processed_generation
    AND job.requested_at <= clock_timestamp() - INTERVAL '500 milliseconds'
    AND (job.lease_token IS NULL OR job.lease_until <= clock_timestamp())
  RETURNING job.evaluation_date, job.source_project_id, job.requested_generation, job.lease_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.renew_daily_results_pdf_archive_worker(
  p_evaluation_date DATE,
  p_lease_token UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  WITH renewed AS (
    UPDATE public.daily_results_pdf_archive_jobs AS job
    SET lease_until = clock_timestamp() + INTERVAL '2 minutes'
    WHERE job.evaluation_date = p_evaluation_date
      AND job.lease_token = p_lease_token
      AND job.lease_until > clock_timestamp()
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM renewed);
$$;

CREATE OR REPLACE FUNCTION public.release_daily_results_pdf_archive_worker(
  p_evaluation_date DATE,
  p_lease_token UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  WITH released AS (
    UPDATE public.daily_results_pdf_archive_jobs AS job
    SET lease_token = NULL, lease_until = NULL
    WHERE job.evaluation_date = p_evaluation_date
      AND job.lease_token = p_lease_token
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM released);
$$;

CREATE OR REPLACE FUNCTION public.get_daily_results_pdf_snapshot_worker(
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
  v_today DATE := (clock_timestamp() AT TIME ZONE 'America/Costa_Rica')::DATE;
BEGIN
  IF p_evaluation_date IS NULL OR p_offset < 0 OR p_limit < 1 OR p_limit > 500 THEN
    RAISE EXCEPTION 'Parámetros de paginación no válidos';
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

CREATE OR REPLACE FUNCTION public.complete_daily_results_pdf_archive_worker(
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
  v_pdf BYTEA;
  v_job public.daily_results_pdf_archive_jobs%ROWTYPE;
  v_archive_key TEXT;
BEGIN
  IF p_project_count < 1 OR btrim(COALESCE(p_feria, '')) = ''
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

CREATE OR REPLACE FUNCTION public.acknowledge_empty_daily_results_pdf_archive_worker(
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
  v_job public.daily_results_pdf_archive_jobs%ROWTYPE;
BEGIN
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

  UPDATE public.daily_results_pdf_archive_jobs
  SET processed_generation = p_requested_generation,
      lease_token = NULL,
      lease_until = NULL
  WHERE evaluation_date = p_evaluation_date AND lease_token = p_lease_token;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.list_pending_daily_results_pdf_archives(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_daily_results_pdf_archive_worker(DATE) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.renew_daily_results_pdf_archive_worker(DATE, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_daily_results_pdf_archive_worker(DATE, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_daily_results_pdf_snapshot_worker(DATE, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_daily_results_pdf_archive_worker(DATE, BIGINT, BIGINT, UUID, TEXT, INTEGER, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.acknowledge_empty_daily_results_pdf_archive_worker(DATE, BIGINT, UUID) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.list_pending_daily_results_pdf_archives(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_daily_results_pdf_archive_worker(DATE) TO service_role;
GRANT EXECUTE ON FUNCTION public.renew_daily_results_pdf_archive_worker(DATE, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_daily_results_pdf_archive_worker(DATE, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_daily_results_pdf_snapshot_worker(DATE, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_daily_results_pdf_archive_worker(DATE, BIGINT, BIGINT, UUID, TEXT, INTEGER, TEXT, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.acknowledge_empty_daily_results_pdf_archive_worker(DATE, BIGINT, UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
