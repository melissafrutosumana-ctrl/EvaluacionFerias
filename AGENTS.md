# Repository Guidelines

## Estructura del proyecto

- Las páginas de entrada están en la raíz (`index.html`, `juez.html`, `usuarios.html` y páginas administrativas).
- `js/` contiene módulos ES; `main.js` selecciona el arranque según `body[data-page]`. `css/styles.css` define la interfaz; `img/` contiene recursos; `sql/` almacena scripts de Supabase; `tests/` contiene pruebas de Node.
- No versionar `node_modules/`, `.env*`, `.vercel/` ni artefactos locales.

## Gestor de paquetes y comandos

- Usar **npm** y el `package-lock.json` versionado: `npm ci` instala dependencias reproducibles.
- `npm run lint` ejecuta ESLint sobre `js/`; para iterar en un módulo, usar `npx eslint js/auth.js`.
- `npm test` ejecuta todas las pruebas; ejecutar una sola con `node --test tests/scoring.test.js`.
- No hay proceso de compilación ni servidor de desarrollo configurado. Servir la raíz con un servidor HTTP estático para probar módulos ES en el navegador.

## Estilo y convenciones

- Escribir JavaScript ES2022 con módulos ESM e importaciones relativas con extensión `.js`.
- Mantener sangría de dos espacios, comillas dobles y nombres descriptivos en `camelCase`; reservar `UPPER_SNAKE_CASE` para constantes exportadas.
- Reutilizar utilidades existentes (`escapeHTML`, `showToast`, `fetchAllRpc`, cálculos y rúbricas) antes de crear variantes. Mantener `main.js` como único punto de arranque y declarar `data-page` en las páginas nuevas.
- Al modificar CSS o JavaScript, incrementar `styles.css?v=X` y `main.js?v=X` en las páginas HTML afectadas.

## Pruebas y datos

- Añadir una prueba `tests/<área>.test.js` por cada cambio de comportamiento o corrección. Nombrar las pruebas según el resultado observable.
- Las pruebas de PDF usan datos representativos locales; no introducir credenciales, tokens ni datos personales en fixtures.
- Ejecutar `npm run lint` y `npm test` antes de enviar cambios.

## Supabase, despliegue y contribuciones

- Tratar `sql/` como cambios revisables: explicar impacto, orden de aplicación y ajustes de RLS. No debilitar la CSP de `vercel.json` sin justificación.
- La clave publishable y URL de Supabase viven en `js/supabase.js`; nunca agregar claves secretas ni de servicio.
- Mantener las correcciones compatibles con el repositorio gemelo CTPQ cuando corresponda. Los commits siguen habitualmente Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`); las PR deben describir alcance, validación, SQL aplicado y capturas para cambios visuales.

## Atribución de commits

- Los commits asistidos por IA deben incluir `Co-Authored-By:` con el modelo y correo de atribución del agente.
