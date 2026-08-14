## Purpose

Unifica el vocabulario visual de las 7 páginas del sistema (tokens, estados hover/focus, jerarquía, espaciado y responsividad móvil) para que toda la interfaz se perciba coherente, ordenada y operable desde pantallas pequeñas, sin adornos que compitan con formularios y tablas.

## ADDED Requirements

### Requirement: Estados hover y focus uniformes
Todo elemento interactivo DEBE mostrar un estado visual consistente de hover y de focus (mismo color de acento, misma curva de transición y mismo estilo de anillo) en todas las páginas y modales. Ningún control puede quedar sin estado distinguible de hover o focus.

#### Scenario: Hover uniforme en botones
- **WHEN** un usuario pasa el cursor sobre cualquier botón del sistema
- **THEN** el botón muestra el mismo estilo de hover (acento y transición) que los demás botones

### Requirement: Jerarquía y espaciado consistentes
Las páginas DEBEN compartir una escala de espaciado y jerarquía tipográfica coherente: títulos, secciones, tablas y formularios usan los mismos tokens de margen/padding y tamaños. Los formularios DEBEN priorizar lectura y prevención de errores, sin campos apretados.

#### Scenario: Misma escala de espaciado entre páginas
- **WHEN** se comparan el espaciado de secciones y formularios entre dos páginas distintas
- **THEN** ambos usan la misma escala de tokens definida en los estilos compartidos

### Requirement: Operabilidad en móvil sin desplazamiento horizontal
Todas las páginas, tablas y modales DEBEN ajustarse a pantallas pequeñas sin desplazamiento horizontal: tablas con columnas adaptadas o contenedor con scroll interno, modales con ancho limitado y controles con suficiente separación para dedos.

#### Scenario: Tabla sin desborde horizontal en móvil
- **WHEN** un usuario abre una página con tabla en un dispositivo de 360 px de ancho
- **THEN** la tabla no provoca desplazamiento horizontal de la página (usa scroll interno o columnas adaptadas)

#### Scenario: Modal usable en móvil
- **WHEN** un usuario abre un modal en un dispositivo móvil
- **THEN** el modal cabe en el ancho de la pantalla y sus controles son alcanzables sin desborde

### Requirement: Micro-interacciones sin ruido visual
Las micro-interacciones (hover, transiciones, aparición de modales) DEBEN ser sutiles y consistentes, sin sombras excesivas ni animaciones decorativas que compitan con formularios y tablas. Deben respetar `prefers-reduced-motion`.

#### Scenario: Transiciones sutiles
- **WHEN** un elemento cambia de estado (hover, apertura de modal)
- **THEN** la transición es breve y discreta, coherente en todo el sitio

### Requirement: Coherencia de marca institucional
La interfaz DEBE mantener la identidad institucional (paleta primaria/acento y tipografías existentes) sin cambios de identidad. El pulido visual DEBE conservar el aspecto ordenado y de confianza del sistema.

#### Scenario: Paleta y tipografía preservadas
- **WHEN** se aplican los estilos nuevos
- **THEN** la paleta de colores y las tipografías existentes se mantienen sin cambios de identidad