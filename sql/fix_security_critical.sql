-- ============================================================
-- FIX DE SEGURIDAD CRITICA - EvaluacionFeria
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Habilitar pgcrypto para bcrypt
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Agregar columna para hash bcrypt (la columna vieja se mantiene para migracion)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS contrasena_bcrypt TEXT;

-- 3. Tabla de sesiones de aplicacion (para RLS)
CREATE TABLE IF NOT EXISTS app_sessions (
  session_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '8 hours'
);

ALTER TABLE app_sessions ENABLE ROW LEVEL SECURITY;

-- 4. Funcion para migrar password SHA-256 -> bcrypt (ejecutar por usuario)
--    Los hashes SHA-256 viejos son base64 de bytes binarios.
--    pgcrypto crypt() espera texto plano como input.
--    Esta funcion SOLO se usa durante la migracion.
CREATE OR REPLACE FUNCTION migrate_user_password(p_user_id BIGINT, p_plain_password TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE usuarios
  SET contrasena_bcrypt = crypt(p_plain_password, gen_salt('bf', 10))
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Funcion de autenticacion segura
--    - Acepta bcrypt si existe contrasena_bcrypt
--    - Fallback: compara SHA-256 client-side si se envia el hash
--    - Establece contexto de sesion para RLS
CREATE OR REPLACE FUNCTION authenticate_user(
  p_username TEXT,
  p_password_hash TEXT  -- SHA-256 en base64 (formato actual del cliente)
)
RETURNS TABLE(
  user_id BIGINT,
  user_name TEXT,
  user_role TEXT,
  user_feria TEXT,
  session_token TEXT
) AS $$
DECLARE
  v_user RECORD;
  v_role TEXT;
  v_session_token TEXT;
BEGIN
  -- Buscar usuario (case-insensitive)
  SELECT u.id, u.nombre, u.contrasena_hash, u.contrasena_bcrypt, u.role_id, u.tipo_feria
  INTO v_user
  FROM usuarios u
  WHERE lower(trim(u.nombre)) = lower(trim(p_username))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Verificar password: primero bcrypt, luego fallback SHA-256
  IF v_user.contrasena_bcrypt IS NOT NULL THEN
    -- bcrypt: verificar con crypt()
    IF v_user.contrasena_bcrypt != crypt(p_password_hash, v_user.contrasena_bcrypt) THEN
      -- El password en texto plano no coincide con bcrypt
      -- Intentar comparar directamente (el cliente envia SHA-256 base64)
      IF v_user.contrasena_bcrypt != crypt(
        convert_from(decode(p_password_hash, 'base64'), 'UTF8'),
        v_user.contrasena_bcrypt
      ) THEN
        RETURN;
      END IF;
    END IF;
  ELSE
    -- Fallback SHA-256: comparar directamente (formato actual)
    IF coalesce(v_user.contrasena_hash, '') != coalesce(p_password_hash, '') THEN
      RETURN;
    END IF;
  END IF;

  -- Obtener nombre del rol
  SELECT r.nombre INTO v_role
  FROM roles r
  WHERE r.id = v_user.role_id;

  IF v_role IS NULL THEN
    RETURN;
  END IF;

  -- Normalizar rol
  IF lower(trim(v_role)) = 'juez' THEN
    v_role := 'Juez';
  ELSIF lower(trim(v_role)) IN ('admin', 'administrador') THEN
    v_role := 'administrador';
  END IF;

  -- Crear sesion
  INSERT INTO app_sessions (user_id, role_name)
  VALUES (v_user.id, v_role)
  RETURNING app_sessions.session_id INTO v_session_token;

  -- Establecer contexto para esta conexion
  PERFORM set_config('app.current_user_id', v_user.id::TEXT, false);
  PERFORM set_config('app.current_user_role', v_role, false);

  RETURN QUERY SELECT v_user.id, v_user.nombre, v_role, v_user.tipo_feria, v_session_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Funcion para restaurar sesion (llamar al cargar pagina)
CREATE OR REPLACE FUNCTION restore_session(p_session_token TEXT)
RETURNS TABLE(
  user_id BIGINT,
  user_name TEXT,
  user_role TEXT,
  user_feria TEXT
) AS $$
DECLARE
  v_session RECORD;
  v_user RECORD;
BEGIN
  -- Buscar sesion valida
  SELECT s.user_id, s.role_name INTO v_session
  FROM app_sessions s
  WHERE s.session_id = p_session_token
    AND s.expires_at > now();

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Obtener datos del usuario
  SELECT u.id, u.nombre, u.tipo_feria INTO v_user
  FROM usuarios u
  WHERE u.id = v_session.user_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Establecer contexto
  PERFORM set_config('app.current_user_id', v_user.id::TEXT, false);
  PERFORM set_config('app.current_user_role', v_session.role_name, false);

  RETURN QUERY SELECT v_user.id, v_user.nombre, v_session.role_name, v_user.tipo_feria;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Funcion para cerrar sesion
CREATE OR REPLACE FUNCTION logout_session(p_session_token TEXT)
RETURNS VOID AS $$
BEGIN
  DELETE FROM app_sessions WHERE session_id = p_session_token;
  PERFORM set_config('app.current_user_id', '', false);
  PERFORM set_config('app.current_user_role', '', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Funcion helper para RLS: obtener usuario actual
CREATE OR REPLACE FUNCTION current_app_user_id()
RETURNS BIGINT AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_user_id', true), '')::BIGINT;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION current_app_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_user_role', true), '');
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- 9. RLS POLICIES - Eliminar las viejas abiertas y crear nuevas
-- ============================================================

-- === ROLES ===
-- Todos pueden leer roles (necesario para login y UI)
DROP POLICY IF EXISTS roles_anon_select ON roles;
DROP POLICY IF EXISTS roles_anon_insert ON roles;
DROP POLICY IF EXISTS roles_anon_update ON roles;
DROP POLICY IF EXISTS roles_anon_delete ON roles;

CREATE POLICY roles_select ON roles FOR SELECT
  USING (true);  -- Roles son publicos

CREATE POLICY roles_admin_insert ON roles FOR INSERT
  WITH CHECK (current_app_user_role() = 'administrador');

CREATE POLICY roles_admin_update ON roles FOR UPDATE
  USING (current_app_user_role() = 'administrador');

CREATE POLICY roles_admin_delete ON roles FOR DELETE
  USING (current_app_user_role() = 'administrador');

-- === USUARIOS ===
DROP POLICY IF EXISTS usuarios_anon_select ON usuarios;
DROP POLICY IF EXISTS usuarios_anon_insert ON usuarios;
DROP POLICY IF EXISTS usuarios_anon_update ON usuarios;
DROP POLICY IF EXISTS usuarios_anon_delete ON usuarios;

CREATE POLICY usuarios_auth_select ON usuarios FOR SELECT
  USING (current_app_user_id() IS NOT NULL);

CREATE POLICY usuarios_admin_insert ON usuarios FOR INSERT
  WITH CHECK (current_app_user_role() = 'administrador');

CREATE POLICY usuarios_admin_update ON usuarios FOR UPDATE
  USING (current_app_user_role() = 'administrador');

CREATE POLICY usuarios_admin_delete ON usuarios FOR DELETE
  USING (current_app_user_role() = 'administrador');

-- === PROYECTOS_FERIAS ===
DROP POLICY IF EXISTS proyectos_anon_select ON proyectos_ferias;
DROP POLICY IF EXISTS proyectos_anon_insert ON proyectos_ferias;
DROP POLICY IF EXISTS proyectos_anon_update ON proyectos_ferias;
DROP POLICY IF EXISTS proyectos_anon_delete ON proyectos_ferias;

CREATE POLICY proyectos_auth_select ON proyectos_ferias FOR SELECT
  USING (current_app_user_id() IS NOT NULL);

CREATE POLICY proyectos_admin_insert ON proyectos_ferias FOR INSERT
  WITH CHECK (current_app_user_role() = 'administrador');

CREATE POLICY proyectos_admin_update ON proyectos_ferias FOR UPDATE
  USING (current_app_user_role() = 'administrador');

CREATE POLICY proyectos_admin_delete ON proyectos_ferias FOR DELETE
  USING (current_app_user_role() = 'administrador');

-- === ASIGNACIONES_JUECES ===
DROP POLICY IF EXISTS asignaciones_anon_select ON asignaciones_jueces;
DROP POLICY IF EXISTS asignaciones_anon_insert ON asignaciones_jueces;
DROP POLICY IF EXISTS asignaciones_anon_update ON asignaciones_jueces;
DROP POLICY IF EXISTS asignaciones_anon_delete ON asignaciones_jueces;

CREATE POLICY asignaciones_auth_select ON asignaciones_jueces FOR SELECT
  USING (current_app_user_id() IS NOT NULL);

CREATE POLICY asignaciones_admin_insert ON asignaciones_jueces FOR INSERT
  WITH CHECK (current_app_user_role() = 'administrador');

CREATE POLICY asignaciones_admin_delete ON asignaciones_jueces FOR DELETE
  USING (current_app_user_role() = 'administrador');

-- === EVALUACIONES_PROYECTOS ===
DROP POLICY IF EXISTS evaluaciones_anon_select ON evaluaciones_proyectos;
DROP POLICY IF EXISTS evaluaciones_anon_insert ON evaluaciones_proyectos;
DROP POLICY IF EXISTS evaluaciones_anon_update ON evaluaciones_proyectos;
DROP POLICY IF EXISTS evaluaciones_anon_delete ON evaluaciones_proyectos;

CREATE POLICY evaluaciones_auth_select ON evaluaciones_proyectos FOR SELECT
  USING (current_app_user_id() IS NOT NULL);

CREATE POLICY evaluaciones_juez_insert ON evaluaciones_proyectos FOR INSERT
  WITH CHECK (
    current_app_user_role() = 'administrador'
    OR (current_app_user_role() = 'Juez' AND juez_id = current_app_user_id())
  );

CREATE POLICY evaluaciones_juez_delete ON evaluaciones_proyectos FOR DELETE
  USING (
    current_app_user_role() = 'administrador'
    OR (current_app_user_role() = 'Juez' AND juez_id = current_app_user_id())
  );

-- === OBSERVACIONES_PROYECTOS ===
DROP POLICY IF EXISTS observaciones_anon_select ON observaciones_proyectos;
DROP POLICY IF EXISTS observaciones_anon_insert ON observaciones_proyectos;
DROP POLICY IF EXISTS observaciones_anon_update ON observaciones_proyectos;
DROP POLICY IF EXISTS observaciones_anon_delete ON observaciones_proyectos;

CREATE POLICY observaciones_auth_select ON observaciones_proyectos FOR SELECT
  USING (current_app_user_id() IS NOT NULL);

CREATE POLICY observaciones_juez_insert ON observaciones_proyectos FOR INSERT
  WITH CHECK (
    current_app_user_role() = 'administrador'
    OR (current_app_user_role() = 'Juez' AND juez_id = current_app_user_id())
  );

CREATE POLICY observaciones_juez_update ON observaciones_proyectos FOR UPDATE
  USING (
    current_app_user_role() = 'administrador'
    OR (current_app_user_role() = 'Juez' AND juez_id = current_app_user_id())
  );

CREATE POLICY observaciones_juez_delete ON observaciones_proyectos FOR DELETE
  USING (
    current_app_user_role() = 'administrador'
    OR (current_app_user_role() = 'Juez' AND juez_id = current_app_user_id())
  );

-- === APP_SESSIONS ===
CREATE POLICY sessions_auth_select ON app_sessions FOR SELECT
  USING (current_app_user_id() IS NOT NULL);

CREATE POLICY sessions_auth_insert ON app_sessions FOR INSERT
  WITH CHECK (true);  -- Se inserta via authenticate_user (SECURITY DEFINER)

CREATE POLICY sessions_auth_delete ON app_sessions FOR DELETE
  USING (
    current_app_user_id() IS NOT NULL
    AND user_id = current_app_user_id()
  );

-- 10. Limpiar sesiones expiradas (ejecutar periodicamente o via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS VOID AS $$
BEGIN
  DELETE FROM app_sessions WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- 11. Indice para sesiones
CREATE INDEX IF NOT EXISTS idx_app_sessions_user ON app_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_app_sessions_expires ON app_sessions(expires_at);

-- ============================================================
-- RESUMEN:
-- 1. Ejecutar este script completo en SQL Editor
-- 2. Migrar passwords existentes con: SELECT migrate_user_password(id, 'password_plano') FROM usuarios;
-- 3. Actualizar el codigo cliente (main.js) para usar authenticate_user/restore_session
-- ============================================================
