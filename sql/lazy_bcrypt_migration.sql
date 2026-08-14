CREATE OR REPLACE FUNCTION public.authenticate_user(p_username text, p_password_hash text)
 RETURNS TABLE(user_id bigint, user_name text, user_role text, user_feria text, session_token text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 AS $function$
     DECLARE
       v_user RECORD;
       v_role TEXT;
       v_session_token TEXT;
       v_bcrypt_match BOOLEAN := FALSE;
       v_username TEXT := lower(trim(p_username));
     BEGIN
       -- Rate limiting: bloquear si hay demasiados intentos fallidos
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
         -- Migracion lazy: SHA-256 valido sin bcrypt aun -> almacenar bcrypt (del mismo valor que envia el cliente)
         IF v_user.contrasena_bcrypt IS NULL THEN
           UPDATE usuarios SET contrasena_bcrypt = extensions.crypt(p_password_hash, extensions.gen_salt('bf', 10)) WHERE id = v_user.id;
         END IF;
       END IF;

       -- Exito: limpiar intentos
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
     $function$
