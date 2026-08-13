# Evaluación de Ferias — CTPM

Sistema de evaluación de ferias institucionales del MEP (CTP Mario Quirós). Frontend vanilla HTML/CSS/JS + Supabase, desplegado en Vercel.

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
- Cache-busting manual: `styles.css?v=X` y `main.js?v=X` (bump al tocar CSS o JS).

## Configuración

Las credenciales de Supabase viven en `js/supabase.js` (publishable key, hardcodeada). No se usan variables de entorno de Vercel.

## Relación con CTPQ

Este proyecto es gemelo de `evaluaciones-CTPQ` (colegio CTP de Quepos). Comparten todo el código salvo:

- `js/supabase.js` (URL y key de Supabase propias de cada colegio)
- Logo e imágenes institucionales
- Repo y despliegue de Vercel

Al corregir un bug o mejorar la UI, aplicar el cambio en **ambos** repos y mantenerlos sincronizados.
