## Purpose

Garantiza que la interfaz del sistema de ferias del MEP cumpla WCAG 2.1 AA, de modo que jueces y administradores puedan operar todo el sistema con teclado, lector de pantalla y sin barreras de contraste, en cualquier dispositivo.

## ADDED Requirements

### Requirement: Etiquetas asociadas a los campos de formulario
Todo campo de entrada en los formularios (login, proyectos, usuarios, asignaciones, observaciones, resultados y modales) DEBE tener una etiqueta de texto asociada, ya sea mediante `label for` vinculado al `id` del campo o `aria-labelledby`. Ningún campo DEBE depender solo del `placeholder`.

#### Scenario: Campo con etiqueta vinculada
- **WHEN** un usuario navega a cualquier página con un formulario
- **THEN** cada campo de entrada tiene una etiqueta de texto asociada programáticamente a él

#### Scenario: Lector de pantalla anuncia el campo
- **WHEN** un lector de pantalla enfoca un campo de entrada
- **THEN** anuncia su etiqueta asociada y su tipo

### Requirement: Foco visible para navegación por teclado
Todo elemento interactivo (botón, enlace, input, select, cierre de modal, item de tabla editable) DEBE mostrar un indicador de foco claramente visible al recibir foco por teclado, con contraste suficiente contra su fondo.

#### Scenario: Navegación por teclado con foco visible
- **WHEN** un usuario recorre la página con la tecla Tab
- **THEN** el elemento enfocado muestra un anillo de foco visible en cada paso

#### Scenario: Foco en elementos de modal
- **WHEN** un usuario abre un modal y navega con Tab
- **THEN** el foco queda contenido dentro del modal hasta cerrarlo

### Requirement: Skip link para saltar navegación
Cada página DEBE incluir un enlace "Saltar al contenido" visible al recibir foco que lleve directo al contenido principal, permitiendo omitir la navegación repetida.

#### Scenario: Saltar navegación
- **WHEN** un usuario presiona Tab en el inicio de una página
- **THEN** aparece el enlace "Saltar al contenido" y, al activarlo, el foco salta al contenido principal

### Requirement: Contraste de color WCAG AA
Todo texto del sistema DEBE cumplir una relación de contraste de al menos 4.5:1 para texto normal y 3:1 para texto grande (≥18pt o 14pt negrita) contra su fondo. Esto aplica a texto de marca, textos secundarios, placeholders y texto sobre fondos de color.

#### Scenario: Contraste suficiente en texto normal
- **WHEN** se evalúa cualquier texto normal del sistema contra su fondo
- **THEN** la relación de contraste es de al menos 4.5:1

### Requirement: Mensajes de estado anunciables
Los mensajes de estado de los formularios (login, guardado de proyectos, asignaciones, observaciones, resultados) DEBEN ser anunciables por lector de pantalla mediante `role="status"` o `aria-live="polite"` en el momento en que aparecen o cambian.

#### Scenario: Error de login anunciado
- **WHEN** un usuario intenta iniciar sesión y falla
- **THEN** el lector de pantalla anuncia el mensaje de error automáticamente

### Requirement: Cierre accesible de modales
Al abrir un modal, el foco DEBE moverse al interior del modal. El modal DEBE poder cerrarse con la tecla Escape y con un botón de cierre explícito. Al cerrarse, el foco DEBE restaurarse en el elemento que lo abrió.

#### Scenario: Abrir y cerrar modal con teclado
- **WHEN** un usuario abre un modal y presiona Escape o el botón de cierre
- **THEN** el modal se cierra y el foco vuelve al elemento que lo abrió

### Requirement: Objetivos táctiles y movimiento reducido
Los controles interactivos DEBEN tener un objetivo táctil de al menos 44×44 px en dispositivos táctiles. El sistema DEBE respetar `prefers-reduced-motion`, reduciendo o eliminando animaciones decorativas para usuarios que lo soliciten.

#### Scenario: Objetivo táctil suficiente
- **WHEN** un usuario táctil toca cualquier botón o control
- **THEN** el objetivo táctil mide al menos 44×44 px

#### Scenario: Animaciones reducidas
- **WHEN** el sistema operativo indica `prefers-reduced-motion: reduce`
- **THEN** las animaciones decorativas se reducen o eliminan sin afectar la funcionalidad