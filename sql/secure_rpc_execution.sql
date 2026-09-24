-- Deploy api/rpc.js using SUPABASE_SECRET_KEY for all RPCs before applying.
-- The API allowlist and each RPC's p_session_token checks remain the access
-- boundary; direct PostgREST execution by public roles is disabled here.
BEGIN;

DO $secure_rpc_execution$
DECLARE
  v_rpc_names TEXT[] := ARRAY[
    'admin_delete_project',
    'admin_delete_user',
    'admin_insert_user',
    'admin_save_assignments',
    'admin_save_project',
    'admin_set_manual_escrito',
    'admin_update_user',
    'authenticate_user',
    'delete_judge_evaluation_draft',
    'get_assignments',
    'get_evaluations',
    'get_evaluations_since',
    'get_judge_evaluation_draft',
    'get_judge_evaluations',
    'get_judge_evaluations_with_titles',
    'get_judge_observation',
    'get_judge_projects',
    'get_observations',
    'get_project',
    'get_projects',
    'get_roles',
    'get_users',
    'logout_session',
    'restore_session',
    'save_evaluations_batch',
    'save_judge_evaluation_draft',
    'save_observation'
  ];
  v_missing TEXT[];
  v_function RECORD;
BEGIN
  SELECT array_agg(expected.name ORDER BY expected.name)
  INTO v_missing
  FROM unnest(v_rpc_names) AS expected(name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = expected.name
      AND p.prokind = 'f'
      AND (expected.name <> 'authenticate_user' OR p.pronargs = 3)
  );

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Expected API RPCs are missing: %', array_to_string(v_missing, ', ');
  END IF;

  FOR v_function IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.proname = ANY(v_rpc_names)
      AND (p.proname <> 'authenticate_user' OR p.pronargs = 3)
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      v_function.signature
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %s TO service_role',
      v_function.signature
    );
  END LOOP;
END;
$secure_rpc_execution$;

COMMIT;
