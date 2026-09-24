-- These legacy per-row RPCs are not called by the current application or its
-- server allowlist. The current client writes evaluations through
-- save_evaluations_batch; do not expose the legacy functions to PostgREST roles.
BEGIN;

DO $revoke_legacy_evaluation_rpcs$
BEGIN
  IF to_regprocedure('public.delete_evaluation(text,bigint,text)') IS NULL
     OR to_regprocedure('public.save_evaluation(text,bigint,text,numeric,text)') IS NULL THEN
    RAISE EXCEPTION 'Expected legacy evaluation RPC signatures are missing';
  END IF;

  REVOKE EXECUTE ON FUNCTION public.delete_evaluation(text,bigint,text)
    FROM PUBLIC, anon, authenticated;
  REVOKE EXECUTE ON FUNCTION public.save_evaluation(text,bigint,text,numeric,text)
    FROM PUBLIC, anon, authenticated;
END;
$revoke_legacy_evaluation_rpcs$;

COMMIT;
