-- Tabla de observaciones por juez por proyecto por tipo de evaluacion
-- Una fila por juez por proyecto por tipo (upsert desde el panel del juez)

CREATE TABLE IF NOT EXISTS observaciones_proyectos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  proyecto_id BIGINT NOT NULL REFERENCES proyectos_ferias(id) ON DELETE CASCADE,
  juez_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo_evaluacion TEXT NOT NULL DEFAULT 'Exposición',
  texto TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT observaciones_proyectos_proyecto_juez_tipo_key UNIQUE (proyecto_id, juez_id, tipo_evaluacion)
);

-- Habilitar RLS (la app usa clave publishable/anon, igual que el resto de tablas)
ALTER TABLE observaciones_proyectos ENABLE ROW LEVEL SECURITY;

-- Politica: lecturas y escrituras anonimas habilitadas
-- (el resto del sistema ya opera con RLS + politica anonima abierta)
DROP POLICY IF EXISTS observaciones_anon_select ON observaciones_proyectos;
DROP POLICY IF EXISTS observaciones_anon_insert ON observaciones_proyectos;
DROP POLICY IF EXISTS observaciones_anon_update ON observaciones_proyectos;
DROP POLICY IF EXISTS observaciones_anon_delete ON observaciones_proyectos;

CREATE POLICY observaciones_anon_select ON observaciones_proyectos
  FOR SELECT TO anon USING (true);

CREATE POLICY observaciones_anon_insert ON observaciones_proyectos
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY observaciones_anon_update ON observaciones_proyectos
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY observaciones_anon_delete ON observaciones_proyectos
  FOR DELETE TO anon USING (true);

-- Indice para buscar observaciones de un juez o un proyecto
CREATE INDEX IF NOT EXISTS observaciones_proyectos_juez_id_idx ON observaciones_proyectos(juez_id);
CREATE INDEX IF NOT EXISTS observaciones_proyectos_proyecto_id_idx ON observaciones_proyectos(proyecto_id);
