-- Agregar columna nivel_educativo para proyectos de Feria Cientifica
-- El nivel no se puede derivar de categoria_pronatecyt porque F9B/F10B
-- pueden ser de III Ciclo O Educacion Diversificada (ambiguo).

ALTER TABLE proyectos_ferias ADD COLUMN IF NOT EXISTS nivel_educativo TEXT;

-- admin_save_project se actualizo para guardar nivel_educativo
-- (ver fix_security_critical.sql para la funcion completa)
