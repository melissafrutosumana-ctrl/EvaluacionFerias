-- Agrega columna para puntaje escrito ingresado manualmente por el admin
ALTER TABLE proyectos_ferias ADD COLUMN IF NOT EXISTS puntaje_escrito_manual NUMERIC;
