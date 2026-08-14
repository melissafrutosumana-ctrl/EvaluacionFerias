## Context

El sistema es HTML/CSS/JS vanilla sin build, con `css/styles.css` (~3800 líneas) como fuente única de estilo y `js/` dividido en módulos (`auth`, `admin`, `judge`, `pdf`, `rubrics`, `data`, `utils`, `main`). Los modales ya fueron unificados en commits recientes y existe un `confirmDialog` estilizado. No hay librerías de UI. El login ya tiene una semilla de accesibilidad en `proposal.md` de raíz (no seguida).

## Goals / Non-Goals

**Goals:**
- Lograr WCAG 2.1 AA reutilizando el máximo posible del CSS existente (tokens ya definidos en `:root`).
- Centralizar los patrones de accesibilidad en helpers reutilizables para no duplicar lógica entre páginas.
- Cambios puramente visuales y de marcado; cero toques a lógica de negocio o RPCs.

**Non-Goals:**
- No migrar rubricas a DB (deuda separada, fuera de alcance).
- No agregar framework ni dependencias nuevas.
- No rediseñar la identidad (paleta y tipografías se preservan).

## Decisions

**D1. Tokenizar focus ring y estados hover en CSS.**
Añadir al `:root` de `styles.css` variables como `--focus-ring` (estilo `box-shadow: 0 0 0 3px <color>)` y aplicar un selector global `:focus-visible` para el anillo. Alternativa: anillos por componente → más código y riesgo de inconsistencia; se descarta. Usar `:focus-visible` (no `:focus`) para no mostrar anillo en clicks de mouse.

**D2. Skip link como utilidad global en `utils.js` + un `<a class="skip-link">` por página.**
Inyectar/estilar un solo `.skip-link` (oculto hasta `:focus-visible`). Alternativa: markup manual repetido en 7 HTML → descartada. El helper `initSkipLink()` se llama en el bootstrap de cada página.

**D3. Modales accesibles con un helper compartido `openModalAccesible()/closeModalAccesible()`.**
Centralizar foco inicial, trampa de foco, Escape y restauración de foco en `utils.js`, y refactorizar los `data-*` modales de `admin.js`/`judge.js` para usarlo. Alternativa: parchear cada modal en su JS → duplicación y riesgo de olvidos; se descarta.

**D4. Contraste resuelto por paleta, no por parche puntual.**
Ajustar en `styles.css` los colores de textos secundarios y de marca (`--ink-secondary`, textos sobre `--secondary`, etc.) que no alcancen 4.5:1, en lugar de sobreescribir caso a caso. Verificación con herramienta de contraste al final.

**D5. Movimiento reducido con `@media (prefers-reduced-motion: reduce)` global.**
Un bloque global que anula transiciones/animaciones decorativas (a la `--transition` del `:root`). Alternativa: respetar por componente → incompleto; se descarta.

**D6. Repos gemelos.**
El cambio se implementa primero en CTPM (repo actual) y se replica idéntico en CTPQ (que solo difiere en `supabase.js` y logo). Los archivos afectados (CSS/HTML/JS compartidos) son idénticos entre repos.

## Risks / Trade-offs

- [Regresión visual al mover estilos globales] → aplicar por fases y revisar cada página en pantalla (desktop y móvil) antes de cerrar.
- [Trampa de foco rota si un modal usa DOM dinámico] → el helper escucha `DOMContentLoaded`/mutaciones mínimas y se prueba con teclado en cada modal.
- [Mensajes `aria-live` duplicados si ya existe `setMessage`] → reutilizar el mecanismo existente de `setMessage` y solo añadir los roles ARIA faltantes, no duplicar el render.
- [Cambio en CSS global afecta ambas páginas de gemelos de forma distinta si divergen] → replicar y verificar en ambos repos.

## Migration Plan

1. Implementar en CTPM: tokens/focus/skip-link/contraste/motion en `styles.css`, helper de modales en `utils.js`, roles ARIA en HTML.
2. Verificar con navegación por teclado, lector de pantalla y auditoría de contraste.
3. Replicar los mismos cambios en CTPQ y verificar.
4. Commit por repo con cache-busting `?v=13.0` (los HTML referencian CSS/JS versionados).
5. Rollback: revertir commit; Vercel redeploya desde git.

## Open Questions

Ninguna que cambie specs, enfoque o desglose. Detalles de tono de color exacto se resuelven durante la implementación sin afectar el diseño.