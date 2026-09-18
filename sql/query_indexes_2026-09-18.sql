-- Índices para las consultas paginadas y filtros habituales de las RPC.
-- Idempotente. Ejecutar en Supabase SQL Editor.

CREATE INDEX IF NOT EXISTS idx_evaluaciones_juez_proyecto_tipo
  ON public.evaluaciones_proyectos (juez_id, proyecto_id, tipo_evaluacion);

CREATE INDEX IF NOT EXISTS idx_evaluaciones_juez_created
  ON public.evaluaciones_proyectos (juez_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_observaciones_juez_proyecto_tipo
  ON public.observaciones_proyectos (juez_id, proyecto_id, tipo_evaluacion);

CREATE INDEX IF NOT EXISTS idx_asignaciones_juez_tipo_proyecto
  ON public.asignaciones_jueces (juez_id, tipo_evaluacion, proyecto_id);

CREATE INDEX IF NOT EXISTS idx_proyectos_feria_titulo_id
  ON public.proyectos_ferias (tipo_feria, titulo, id);

CREATE INDEX IF NOT EXISTS idx_usuarios_nombre_normalizado
  ON public.usuarios (lower(btrim(nombre)));

CREATE INDEX IF NOT EXISTS idx_app_sessions_valid
  ON public.app_sessions (session_id, expires_at);
