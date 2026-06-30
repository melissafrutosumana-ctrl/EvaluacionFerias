-- 1. Agregar columna tipo_evaluacion (si no existe)
ALTER TABLE evaluaciones_proyectos ADD COLUMN IF NOT EXISTS tipo_evaluacion TEXT DEFAULT 'Exposición';

-- 2. Eliminar filas duplicadas y re-crear la constraint
-- Primero eliminar duplicados (conservar solo 1 fila por proyecto+juez+tipo+criterio)
DELETE FROM evaluaciones_proyectos
WHERE ctid NOT IN (
  SELECT MIN(ctid)
  FROM evaluaciones_proyectos
  GROUP BY proyecto_id, juez_id, tipo_evaluacion, criterio
);

-- 3. Eliminar constraint anterior (si existe)
ALTER TABLE evaluaciones_proyectos DROP CONSTRAINT IF EXISTS evaluaciones_proyectos_proyecto_id_juez_id_criterio_key;

-- 4. Crear nueva constraint con tipo_evaluacion
ALTER TABLE evaluaciones_proyectos ADD CONSTRAINT evaluaciones_proyectos_proyecto_id_juez_id_tipo_criterio_key UNIQUE (proyecto_id, juez_id, tipo_evaluacion, criterio);
