# Evaluación de Ferias — CTPM

Sistema de evaluación de ferias institucionales del MEP (Colegio Técnico Profesional de Matapalo). Frontend vanilla HTML/CSS/JS + Supabase, desplegado en Vercel.

## Stack

- HTML5, CSS3 (custom properties), JavaScript ES Modules
- Supabase (PostgreSQL + RLS, auth vía RPC)
- jsPDF (CDN) para exportar PDF
- Sin build tools ni framework

## Páginas

`index` (login), `usuarios`, `proyectos`, `asignaciones`, `resultados`, `observaciones`, `juez`.

## Despliegue

- Vercel: https://evaluacion-ferias.vercel.app
- Repo: https://github.com/melissafrutosumana-ctrl/EvaluacionFerias
- Cache-busting: ejecutar `npm run check:cache-busting` antes de publicar; el chequeo exige versiones consistentes en todas las páginas y en los imports ESM locales.

## Configuración

La URL y la publishable key de Supabase se administran como variables de entorno del proyecto en Vercel. El frontend las obtiene mediante `/api/config`; nunca se agregan valores reales al repositorio.

## Contrato de migración y verificación de seguridad

La remediación de seguridad de `sql/security_remediation_2026-09-20.sql` se aplica después de las migraciones históricas de autenticación y borradores, y antes de cualquier despliegue que dependa de sus RPC. No se deben ejecutar `sql/rate_limiting.sql` ni `sql/lazy_bcrypt_migration.sql` después de esta remediación.

### Orden de aplicación

1. Confirmar que existen `public.login_attempts` y `public.judge_evaluation_drafts` junto con sus funciones históricas.
2. Aplicar las migraciones históricas de autenticación, drafts y asignaciones en el orden documentado por sus archivos SQL.
3. Aplicar `sql/security_remediation_2026-09-20.sql` en una transacción y conservar el resultado de cada sentencia de verificación.
4. Confirmar que la transacción terminó con `COMMIT`; si falla antes del commit, corregir la causa y volver a ejecutar después de verificar el estado actual.

### Objetos e invariantes cubiertos

- `public.login_attempts`: el bloqueo combina usuario y solicitante, y no persiste un estado sin una dimensión de solicitante confiable.
- `login_requester_key()`, `record_failed_attempt(text, text)`, `is_locked_out(text, text)` y sus firmas heredadas: mantienen `search_path` fijo y evitan buckets globales por usuario.
- `authenticate_user(text, text)`: conserva la firma pública, limita su ejecución a `anon` y `authenticated`, y usa la dimensión de solicitante.
- `public.judge_evaluation_drafts` y `save/get/delete_judge_evaluation_draft`: RLS, ACL, `search_path` fijo, payload limitado y validación de estructura, tamaño, cardinalidad y frecuencia.
- `admin_save_assignments(text, bigint, jsonb)`: autoriza al administrador y valida proyectos y tipos de evaluación sin imponer un tope artificial de dos proyectos.

### Verificación SQL mínima

```sql
SELECT count(*) AS invalid_requester_rows
FROM public.login_attempts
WHERE requester_key IS NULL;

SELECT count(*) AS oversized_drafts
FROM public.judge_evaluation_drafts
WHERE octet_length(draft_data::text) > 32768;

SELECT p.oid::regprocedure, p.prosecdef, n.nspname AS schema_name,
       pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('authenticate_user', 'save_judge_evaluation_draft',
                    'get_judge_evaluation_draft', 'delete_judge_evaluation_draft',
                    'cleanup_expired_judge_evaluation_drafts', 'admin_save_assignments');
```

Antes de aplicar una corrección posterior, guardar las definiciones actuales con `pg_get_functiondef` y los ACL/RLS de los objetos afectados. El script tiene rollback transaccional antes de `COMMIT`; después de confirmar la transacción, el rollback requiere restaurar las definiciones y políticas previamente guardadas.

### Comprobación UI/API posterior al despliegue

- [ ] `/api/config` responde únicamente con la configuración pública esperada.
- [ ] Un inicio de sesión válido funciona y una credencial inválida no crea un bloqueo global compartido entre solicitantes.
- [ ] Un juez puede guardar, recuperar y eliminar su borrador propio; un borrador sobredimensionado o con estructura inválida es rechazado.
- [ ] Un usuario sin permisos no puede invocar las RPC administrativas; un administrador puede guardar asignaciones válidas.
- [ ] La pantalla de Resultados refleja una evaluación recién guardada después de la sincronización incremental.

## Relación con CTPQ

Este proyecto es gemelo de `evaluaciones-CTPQ` (Colegio Técnico Profesional de Quepos). Comparten todo el código salvo:

- `api/config.js` y `js/supabase.js` (carga de configuración pública de Supabase desde Vercel)
- Logo e imágenes institucionales
- Repo y despliegue de Vercel

Al corregir un bug o mejorar la UI, aplicar el cambio en **ambos** repos y mantenerlos sincronizados.
