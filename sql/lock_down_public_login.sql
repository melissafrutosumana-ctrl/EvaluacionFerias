-- Phase 2: run only after the new Vercel RPC proxy is deployed and login works.
-- This revokes direct Data API access to the old login and its legacy limiter.

REVOKE ALL ON FUNCTION public.authenticate_user(TEXT, TEXT) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_locked_out(TEXT) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.record_failed_attempt(TEXT) FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.login_attempts FROM PUBLIC, anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
