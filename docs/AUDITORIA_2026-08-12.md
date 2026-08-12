# Auditoria Completa - EvaluacionFeria
**Fecha:** 2026-08-12  
**Proyecto:** Sistema de Evaluacion de Ferias Institucionales MEP  
**Stack:** HTML/CSS/JS + Supabase (PostgreSQL)

---

## Resumen Ejecutivo

Sistema funcional para evaluacion de ferias cientificas, Expotecnica y Festival de Artes. Frontend vanilla sin build tools. **2 problemas criticos de seguridad** requieren atencion inmediata.

| Metrica | Valor |
|---------|-------|
| Archivos JS | 2 (main.js ~6000 lineas, supabase.js 6 lineas) |
| Paginas HTML | 7 |
| CSS | 1 archivo (~4000 lineas) |
| SQL migraciones | 2 |
| Tests | 0 |
| Nodos en grafo | 159 |
| Edges | 389 |

---

## Hallazgos de Seguridad

### CRITICO
| # | Hallazgo | Riesgo | Ubicacion |
|---|----------|--------|-----------|
| 1 | Supabase anon key expuesta en codigo fuente | Acceso anonimo total a DB | `js/supabase.js:4` |
| 2 | RLS policies con `USING true` (acceso abierto) | Cualquiera puede leer/escribir/borrar | `sql/*.sql` |

### ALTO
| # | Hallazgo | Riesgo | Ubicacion |
|---|----------|--------|-----------|
| 3 | SHA-256 sin salt para passwords | Vulnerable a rainbow tables | `js/main.js:921-933` |
| 4 | Comparacion de password en texto plano primero | Si DB tiene texto plano, se acepta | `js/main.js:935-948` |

### MEDIO
| # | Hallazgo | Riesgo | Ubicacion |
|---|----------|--------|-----------|
| 5 | Sin rate limiting en login | Brute force posible | `js/main.js:4383` |
| 6 | Session en sessionStorage | Se pierde al cerrar pestaña | `js/main.js:2` |

### BAJO
| # | Hallazgo | Riesgo | Ubicacion |
|---|----------|--------|-----------|
| 7 | Sin CSP headers | XSS no mitigado a nivel HTTP | - |
| 8 | HTML con whitespace innecesario | Tamaño de transferencia | Todos los .html |

---

## Hallazgos de Arquitectura

| # | Hallazgo | Impacto | Recomendacion |
|---|----------|---------|---------------|
| 1 | Archivo monolitico main.js (~6000 lineas) | Mantenibilidad | Dividir en modulos |
| 2 | Rubrics hardcodeadas (~2000 lineas) | Flexibilidad | Migrar a DB |
| 3 | 0 tests automatizados | Confiabilidad | Agregar tests unitarios |
| 4 | Sin linting/typecheck | Calidad | Agregar ESLint |
| 5 | Funciones con logica duplicada | DRY | Extraer helpers comunes |

---

## Hotspots (mayor dependencia)

| Funcion | Fan-in | Rol |
|---------|--------|-----|
| `escapeHTML` | 16 | Anti-XSS |
| `setMessage` | 8 | UI feedback |
| `showToast` | 8 | Notificaciones |
| `normalizeRoleName` | 7 | Normalizacion roles |
| `isMissingColumnError` | 5 | Tolerancia a migraciones |
| `getRubricIndicatorsByFeria` | 4 | Rubricas |

---

## Clusters Funcionales

1. **Admin CRUD** - Gestion de usuarios, proyectos, asignaciones
2. **Judge Evaluation** - Renderizado de rubricas, guardado, progreso
3. **PDF Generation** - jsPDF, headers, footers, tablas
4. **Auth Flow** - Login, sesion, hash de passwords
5. **Data Loading** - Queries con fallbacks para columnas faltantes

---

## Recomendaciones Prioritarias

### Urgente (hacer ahora)
1. Implementar RLS restrictivo o migrar a Supabase Auth real
2. Migrar passwords a bcrypt via server-side function

### Alto (hacer esta semana)
3. Extraer rubrics a tabla en DB
4. Dividir main.js en modulos (auth, admin, judge, pdf, rubrics)

### Medio (hacer este mes)
5. Agregar ESLint + config basica
6. Agregar tests unitarios para funciones criticas

### Bajo (cuando se pueda)
7. Limpiar HTML whitespace
8. Agregar CSP headers

---

## Indexacion

- **codebase-memory:** Proyecto indexado como `EvaluacionFeria` (159 nodos, 389 edges)
- **mempalace:** Auditoria guardada en wing `EvaluacionFeria`, room `auditoria`
