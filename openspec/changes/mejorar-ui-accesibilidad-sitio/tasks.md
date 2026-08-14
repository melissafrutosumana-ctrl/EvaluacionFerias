## 1. Fundamentos CSS y navegación

- [x] 1.1 Agregar tokens de focus ring (`--focus-ring`, `--focus-ring-offset`) y selector global `:focus-visible` en `css/styles.css`
- [x] 1.2 Agregar bloque global `@media (prefers-reduced-motion: reduce)` que anule transiciones y animaciones decorativas (ya existía en styles.css, verificado y sin cambios)
- [x] 1.3 Ajustar colores de texto que no cumplan 4.5:1 (`--ink-secondary`, textos sobre `--secondary`, placeholders) y verificar contraste (nuevo token `--gold-strong: #7a5d12` = 6.17:1 aplicado a .feria-badge, .role-admin, .judge-pending, .pending-icon)
- [x] 1.4 Agregar estilos `.skip-link` (oculto salvo `:focus-visible`) y helper `initSkipLink()` en `js/utils.js` — desviación documentada: se usó la técnica WCAG G1 (ancla `#main-content` + `tabindex="-1"` en `<main>`) verificada en Chrome; el helper JS era innecesario
- [x] 1.5 Agregar `<a class="skip-link">Saltar al contenido</a>` y `id="main-content"` (o equivalente) en las 7 páginas HTML

## 2. Modales accesibles

- [x] 2.1 Implementar helpers compartidos `openModalAccesible()` y `closeModalAccesible()` en `js/utils.js` (foco inicial, trampa de foco, Escape, restauración de foco)
- [x] 2.2 Refactorizar los modales de `js/admin.js` y `js/judge.js` para usar los helpers compartidos (admin.js: asignación, editar usuario, editar proyecto; auth.js: logout; utils.js: confirmDialog. judge.js no tiene modales propios)
- [x] 2.3 Verificar con teclado (Tab/Escape) la trampa de foco y la restauración en cada modal de cada página (probado en Chrome: ciclo Tab, Shift+Tab, Escape y restauración de foco)

## 3. Formularios y mensajes de estado

- [x] 3.1 Asociar etiquetas (`label for`/`aria-labelledby`) a todos los inputs de todas las páginas y modales (login, proyectos, usuarios, asignaciones, observaciones, resultados) — los labels wrapping existentes ya asocian programáticamente (técnica H44, confirmado por Lighthouse 100 y snapshot); se agregó `aria-label` al único input sin etiqueta visible (`[data-modal-search]`)
- [x] 3.2 Asegurar `role="status"` / `aria-live="polite"` en los mensajes de estado de formularios y modales, reutilizando el mecanismo `setMessage` existente (los status HTML ya tenían `role="alert" aria-live="polite"`; se agregó `role="status"` al status del modal de editar usuario)
- [x] 3.3 Agregar `aria-label` a botones de icono (cerrar modal, editar, borrar, ingresar manual) en todas las páginas (`#edit-user-close`, `[data-close-modal]`, `.btn-manual-escrito` ×2; `[data-modal-close]` ya lo tenía; acciones de tabla tienen texto visible)

## 4. Consistencia visual y móvil

- [x] 4.1 Unificar estados hover/focus en botones, enlaces y controles usando los tokens compartidos (`:focus-visible` global + quitar `outline: none` de `.field-label`, `.filter-label`, `.modal-search`)
- [x] 4.2 Revisar jerarquía y espaciado con la escala de tokens existente en las 7 páginas (títulos, secciones, tablas, formularios) — sin discrepancias críticas detectadas
- [x] 4.3 Verificar que tablas y modales no provoquen desplazamiento horizontal en 360 px y que los objetivos táctiles midan ≥44×44 px (`@media (pointer: coarse)` para `.table-action-btn`, `.modal-close`, `.modal-close-btn`; tablas ya usan `.table-wrap` con overflow-x)

## 5. Verificación y despliegue

- [x] 5.1 Recorrer cada página con teclado y lector de pantalla (login, admin, juez, asignaciones, proyectos, resultados, observaciones) confirmando foco, skip link y anuncios (recorrido de teclado en Chrome; anuncios verificados por estructura role/aria-live/label — lector de pantalla no disponible en el entorno)
- [x] 5.2 Ejecutar auditoría de contraste y de accesibilidad (p. ej. axe/Lighthouse) sobre las páginas principales (Lighthouse: Accessibility 100 en index.html; páginas con sesión verificadas estructuralmente)
- [x] 5.3 Correr `npm run lint` y `npm test` para confirmar cero regresiones (lint OK, 13/13 tests OK)
- [x] 5.4 Subir cache-busting a `v=13.0` en los HTML que referencian CSS/JS y commit en CTPM
- [x] 5.5 Replicar todos los cambios en el repo gemelo CTPQ, verificar y commit

## 6. No goals (verificación de no-cumplimiento)

- [x] 6.1 Confirmar que no se tocó lógica de negocio, RPCs ni esquema SQL (cambios solo en CSS, JS de UI y HTML)