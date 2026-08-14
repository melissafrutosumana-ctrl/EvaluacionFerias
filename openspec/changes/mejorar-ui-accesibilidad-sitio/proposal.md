## Why

El sistema de ferias institucionales del MEP está funcional y saneado en seguridad (bcrypt, RPCs protegidas, CSP/HSTS), pero la interfaz no ha recibido atención de producto: formularios y tablas no cumplen WCAG AA, hay barreras de accesibilidad en login y modales, y faltan micro-interacciones y consistencia visual entre las 7 páginas. PRODUCT.md exige claridad, operabilidad en móvil y confianza institucional, y la accesibilidad es requisito de un sistema público educativo.

## What Changes

- Asociar correctamente etiquetas (`<label for>` / `aria-labelledby`) a todos los inputs de los formularios de todas las páginas.
- Agregar indicador de foco visible para navegación por teclado (focus ring) en botones, enlaces, inputs y elementos de modales.
- Agregar "skip link" para saltar la navegación en cada página.
- Asegurar contraste de color que cumpla WCAG AA para todo texto.
- Hacer anunciables por lector de pantalla los mensajes de estado del formulario (login y modales) con `role="status"` / `aria-live`.
- Cierre claro y accesible de modales: foco al abrir, trampa de foco, tecla Escape, foco restaurado al cerrar.
- Objetivos táctiles cómodos (mín. 44px) y soporte para `prefers-reduced-motion`.
- Pulido visual consistente: hover/focus states uniformes, jerarquía y espaciado, sin regresiones en móvil.
- Sin cambios en lógica de negocio ni en las RPCs de Supabase.

## Capabilities

### New Capabilities
- `accesibilidad`: requisitos WCAG 2.1 AA de la interfaz (etiquetas, foco, skip link, contraste, lectores de pantalla, modales, movimiento reducido).
- `consistencia-visual`: vocabulario visual compartido entre páginas (tokens, hover/focus, jerarquía, espaciado, responsividad móvil).

### Modified Capabilities
<!-- Ninguna: no existen specs previas ni se modifica comportamiento de negocio. -->

## Impact

- **Código:** `css/styles.css` (~3800 líneas, tokens y componentes), los 7 `*.html`, `js/utils.js`, `js/auth.js`, `js/admin.js`, `js/judge.js`, `js/main.js`.
- **Sin impacto:** lógica de puntajes, RPCs de Supabase, esquema SQL, desplegues (Vercel).
- **Repos gemelos:** CTPM y CTPQ comparten el mismo frontend; el cambio debe replicarse en ambos.
- **Dependencias:** ninguna nueva (todo es HTML/CSS/JS vanilla + atributos ARIA).