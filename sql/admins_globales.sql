-- Los administradores tienen acceso global; solo los jueces pertenecen a una feria.
-- Ejecutar una vez en Supabase SQL Editor.

BEGIN;

ALTER TABLE public.usuarios
  ALTER COLUMN tipo_feria DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.enforce_user_feria_by_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  v_role TEXT;
BEGIN
  SELECT lower(trim(nombre))
  INTO v_role
  FROM public.roles
  WHERE id = NEW.role_id;

  IF v_role IN ('admin', 'administrador') THEN
    NEW.tipo_feria := NULL;
  ELSIF v_role = 'juez' AND NULLIF(btrim(NEW.tipo_feria), '') IS NULL THEN
    RAISE EXCEPTION 'Los jueces deben tener una feria asignada';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_user_feria_by_role ON public.usuarios;
CREATE TRIGGER trg_enforce_user_feria_by_role
  BEFORE INSERT OR UPDATE OF role_id, tipo_feria ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_user_feria_by_role();

UPDATE public.usuarios AS u
SET tipo_feria = NULL
FROM public.roles AS r
WHERE r.id = u.role_id
  AND lower(trim(r.nombre)) IN ('admin', 'administrador');

COMMIT;
