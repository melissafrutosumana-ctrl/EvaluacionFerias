-- Rate limiting en login: bloquea tras 5 intentos fallidos en 15 minutos

-- 1. Tabla de intentos fallidos
CREATE TABLE IF NOT EXISTS login_attempts (
  username TEXT PRIMARY KEY,
  failed_count INT NOT NULL DEFAULT 0,
  last_failed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Registrar intento fallido
CREATE OR REPLACE FUNCTION record_failed_attempt(p_username TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO login_attempts (username, failed_count, last_failed_at)
  VALUES (p_username, 1, now())
  ON CONFLICT (username) DO UPDATE
  SET failed_count = CASE
        WHEN login_attempts.last_failed_at < now() - INTERVAL '15 minutes' THEN 1
        ELSE login_attempts.failed_count + 1
      END,
      last_failed_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Verificar si está bloqueado (>= 5 fallos en 15 min)
CREATE OR REPLACE FUNCTION is_locked_out(p_username TEXT)
RETURNS BOOLEAN AS $$
DECLARE v_locked BOOLEAN;
BEGIN
  SELECT (failed_count >= 5 AND last_failed_at > now() - INTERVAL '15 minutes') INTO v_locked
  FROM login_attempts WHERE username = p_username;
  RETURN COALESCE(v_locked, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. authenticate_user con rate limiting (reemplaza la versión anterior)
CREATE OR REPLACE FUNCTION public.authenticate_user(p_username text, p_password_hash text)
RETURNS TABLE(user_id bigint, user_name text, user_role text, user_feria text, session_token text)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_role TEXT;
  v_session_token TEXT;
  v_bcrypt_match BOOLEAN := FALSE;
  v_username TEXT := lower(trim(p_username));
BEGIN
  IF is_locked_out(v_username) THEN
    RETURN;
  END IF;

  SELECT u.id, u.nombre, u.contrasena_hash, u.contrasena_bcrypt, u.role_id, u.tipo_feria
  INTO v_user
  FROM usuarios u
  WHERE lower(trim(u.nombre)) = v_username
  LIMIT 1;

  IF NOT FOUND THEN
    PERFORM record_failed_attempt(v_username);
    RETURN;
  END IF;

  IF v_user.contrasena_bcrypt IS NOT NULL THEN
    BEGIN
      v_bcrypt_match := (v_user.contrasena_bcrypt = extensions.crypt(p_password_hash, v_user.contrasena_bcrypt));
    EXCEPTION WHEN OTHERS THEN
      v_bcrypt_match := FALSE;
    END;
  END IF;

  IF NOT v_bcrypt_match THEN
    IF coalesce(v_user.contrasena_hash, '') != coalesce(p_password_hash, '') THEN
      PERFORM record_failed_attempt(v_username);
      RETURN;
    END IF;
  END IF;

  DELETE FROM login_attempts WHERE username = v_username;

  SELECT r.nombre INTO v_role FROM roles r WHERE r.id = v_user.role_id;
  IF v_role IS NULL THEN RETURN; END IF;

  IF lower(trim(v_role)) = 'juez' THEN v_role := 'Juez';
  ELSIF lower(trim(v_role)) IN ('admin', 'administrador') THEN v_role := 'administrador';
  END IF;

  INSERT INTO app_sessions (user_id, role_name)
  VALUES (v_user.id, v_role)
  RETURNING app_sessions.session_id INTO v_session_token;

  RETURN QUERY SELECT v_user.id, v_user.nombre, v_role, v_user.tipo_feria, v_session_token;
END;
$$;
