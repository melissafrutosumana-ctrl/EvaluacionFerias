-- Optimización de base de datos: triggers y constraints
-- Ejecutar en SQL Editor de Supabase

-- 1. Función trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger en observaciones_proyectos (auto actualiza updated_at)
DROP TRIGGER IF EXISTS trg_observaciones_updated_at ON observaciones_proyectos;
CREATE TRIGGER trg_observaciones_updated_at
BEFORE UPDATE ON observaciones_proyectos
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. Constraint: nota entre 0 y 10 (máximo es F13B con 10 puntos por indicador)
ALTER TABLE evaluaciones_proyectos
DROP CONSTRAINT IF EXISTS evaluaciones_proyectos_nota_check;
ALTER TABLE evaluaciones_proyectos
ADD CONSTRAINT evaluaciones_proyectos_nota_check CHECK (nota >= 0 AND nota <= 10);

-- 4. Constraint: puntaje escrito manual (0-110 o null)
ALTER TABLE proyectos_ferias
DROP CONSTRAINT IF EXISTS chk_puntaje_escrito_manual;
ALTER TABLE proyectos_ferias
ADD CONSTRAINT chk_puntaje_escrito_manual
CHECK (puntaje_escrito_manual IS NULL OR (puntaje_escrito_manual >= 0 AND puntaje_escrito_manual <= 110));

-- 5. Trigger: auto-limpieza de sesiones expiradas al crear una nueva
CREATE OR REPLACE FUNCTION cleanup_sessions_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM app_sessions WHERE expires_at < now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cleanup_sessions ON app_sessions;
CREATE TRIGGER trg_cleanup_sessions
BEFORE INSERT ON app_sessions
FOR EACH ROW EXECUTE FUNCTION cleanup_sessions_on_insert();

-- 6. Índices para filtros por tipo_evaluacion
CREATE INDEX IF NOT EXISTS idx_evaluaciones_tipo ON evaluaciones_proyectos(tipo_evaluacion);
CREATE INDEX IF NOT EXISTS idx_asignaciones_tipo ON asignaciones_jueces(tipo_evaluacion);
