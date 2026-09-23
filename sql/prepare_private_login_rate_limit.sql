-- Phase 1: prepare a server-only login RPC with IP-scoped throttling.
-- Apply before deploying api/rpc.js. This leaves the old two-argument RPC
-- available temporarily so the current production frontend keeps working.

CREATE TABLE IF NOT EXISTS public.login_attempts_by_ip_user (
  ip_hash TEXT NOT NULL CHECK (ip_hash ~ '^[a-f0-9]{64}$'),
  username TEXT NOT NULL,
  failed_count INT NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  last_failed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ip_hash, username)
);

CREATE TABLE IF NOT EXISTS public.login_attempts_by_ip (
  ip_hash TEXT PRIMARY KEY CHECK (ip_hash ~ '^[a-f0-9]{64}$'),
  failed_count INT NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  last_failed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS login_attempts_by_ip_user_last_failed_idx
  ON public.login_attempts_by_ip_user (last_failed_at);

CREATE INDEX IF NOT EXISTS login_attempts_by_ip_last_failed_idx
  ON public.login_attempts_by_ip (last_failed_at);

ALTER TABLE public.login_attempts_by_ip_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts_by_ip ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.login_attempts_by_ip_user FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.login_attempts_by_ip FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.authenticate_user(
  p_username TEXT,
  p_password_hash TEXT,
  p_client_ip_hash TEXT
)
RETURNS TABLE(
  user_id BIGINT,
  user_name TEXT,
  user_role TEXT,
  user_feria TEXT,
  session_token TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user RECORD;
  v_role TEXT;
  v_session_token TEXT;
  v_bcrypt_match BOOLEAN := FALSE;
  v_password_valid BOOLEAN := FALSE;
  v_username TEXT := lower(trim(coalesce(p_username, '')));
  v_ip_user_failures INT := 0;
  v_ip_failures INT := 0;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF p_client_ip_hash IS NULL OR p_client_ip_hash !~ '^[a-f0-9]{64}$'
    OR v_username = '' OR p_password_hash IS NULL THEN
    RETURN;
  END IF;

  -- Serialize concurrent login attempts from one client before checking limits.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_client_ip_hash, 0));

  DELETE FROM public.login_attempts_by_ip_user
  WHERE last_failed_at < v_now - INTERVAL '24 hours';
  DELETE FROM public.login_attempts_by_ip
  WHERE last_failed_at < v_now - INTERVAL '24 hours';

  SELECT failed_count INTO v_ip_user_failures
  FROM public.login_attempts_by_ip_user
  WHERE ip_hash = p_client_ip_hash AND username = v_username
    AND last_failed_at > v_now - INTERVAL '15 minutes';

  SELECT failed_count INTO v_ip_failures
  FROM public.login_attempts_by_ip
  WHERE ip_hash = p_client_ip_hash
    AND last_failed_at > v_now - INTERVAL '15 minutes';

  IF coalesce(v_ip_user_failures, 0) >= 5 OR coalesce(v_ip_failures, 0) >= 20 THEN
    RETURN;
  END IF;

  SELECT u.id, u.nombre, u.contrasena_hash, u.contrasena_bcrypt, u.role_id, u.tipo_feria
  INTO v_user
  FROM public.usuarios u
  WHERE lower(trim(u.nombre)) = v_username
  LIMIT 1;

  IF FOUND THEN
    IF v_user.contrasena_bcrypt IS NOT NULL THEN
      BEGIN
        v_bcrypt_match := (v_user.contrasena_bcrypt = extensions.crypt(p_password_hash, v_user.contrasena_bcrypt));
      EXCEPTION WHEN OTHERS THEN
        v_bcrypt_match := FALSE;
      END;
    END;

    v_password_valid := v_bcrypt_match
      OR coalesce(v_user.contrasena_hash, '') = coalesce(p_password_hash, '');
  END IF;

  IF NOT v_password_valid THEN
    INSERT INTO public.login_attempts_by_ip_user AS current_attempts (ip_hash, username, failed_count, last_failed_at)
    VALUES (p_client_ip_hash, v_username, 1, v_now)
    ON CONFLICT (ip_hash, username) DO UPDATE
    SET failed_count = CASE
          WHEN current_attempts.last_failed_at < v_now - INTERVAL '15 minutes' THEN 1
          ELSE current_attempts.failed_count + 1
        END,
        last_failed_at = v_now;

    INSERT INTO public.login_attempts_by_ip AS current_attempts (ip_hash, failed_count, last_failed_at)
    VALUES (p_client_ip_hash, 1, v_now)
    ON CONFLICT (ip_hash) DO UPDATE
    SET failed_count = CASE
          WHEN current_attempts.last_failed_at < v_now - INTERVAL '15 minutes' THEN 1
          ELSE current_attempts.failed_count + 1
        END,
        last_failed_at = v_now;
    RETURN;
  END IF;

  DELETE FROM public.login_attempts_by_ip_user
  WHERE ip_hash = p_client_ip_hash AND username = v_username;

  SELECT r.nombre INTO v_role FROM public.roles r WHERE r.id = v_user.role_id;
  IF v_role IS NULL THEN RETURN; END IF;

  IF lower(trim(v_role)) = 'juez' THEN v_role := 'Juez';
  ELSIF lower(trim(v_role)) IN ('admin', 'administrador') THEN v_role := 'administrador';
  END IF;

  INSERT INTO public.app_sessions (user_id, role_name)
  VALUES (v_user.id, v_role)
  RETURNING app_sessions.session_id INTO v_session_token;

  RETURN QUERY SELECT v_user.id, v_user.nombre, v_role, v_user.tipo_feria, v_session_token;
END;
$$;

REVOKE ALL ON FUNCTION public.authenticate_user(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.authenticate_user(TEXT, TEXT, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
