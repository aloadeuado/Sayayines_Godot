# Requisitos — Arena en vivo (`/`)

## Introducción

La ruta raíz muestra solo el juego para capturarlo en el stream: canvas, fondo de Isla Kame, luchadores con sprites, auras por nivel, barras de HP/XP, efectos de poderes y un overlay de hitboxes opcional. Su prioridad es seguir dibujando aunque Firestore falle.

## Requisitos

### HU-ARE-01 — Ver la arena al abrir la URL
**Historia de usuario:** Como operador del stream, quiero que la raíz `/` muestre la arena de inmediato, para capturarla en OBS sin pasos extra.

**Criterios de aceptación**
1. CUANDO se abre `/` (o `/index.html`), el sistema DEBE iniciar la vista de arena mediante `main.js` → `startArena()`.
2. CUANDO se abre `/ki-arena.html?env=X`, el sistema DEBE redirigir a `/` conservando el query string.
3. El sistema DEBE dibujar el canvas lógico de `900 × 540` con la imagen de fondo Isla Kame, adaptando su ancho por CSS.
4. La vista `/` NO DEBE contener formularios de Settings ni el panel de chat de operador.

### HU-ARE-02 — La arena nunca se queda en blanco
**Historia de usuario:** Como operador, quiero que el mapa siga dibujándose aunque Firebase falle, para que el stream nunca muestre una pantalla vacía.

**Criterios de aceptación**
1. CUANDO arranca la arena, el sistema DEBE iniciar `requestAnimationFrame` antes de esperar cualquier lectura de Firestore.
2. SI la lectura de Settings falla, ENTONCES el sistema DEBE usar `DEFAULT_GAME_SETTINGS` y continuar el arranque.
3. SI la carga de jugadores o mensajes falla, ENTONCES el sistema DEBE mostrar el error en `#firebase-status` y seguir renderizando.
4. CUANDO una petición a Firestore tarda más de 10 s, el sistema DEBE abortarla.

### HU-ARE-03 — Aura según nivel
**Historia de usuario:** Como espectador, quiero ver un aura que crece y cambia de color con el nivel, para reconocer a los luchadores fuertes.

**Criterios de aceptación**
1. El sistema DEBE dibujar el aura con tono HSL que va de 120 (verde, nivel 1) a 0 (rojo, nivel 100) según `p = (nivel − 1)/99`.
2. El radio del aura DEBE ser `34 + √(nivel − 1) × 4`.
3. MIENTRAS un luchador prepara un poder, el sistema DEBE dibujar un aura de carga.

### HU-ARE-04 — Barras sobre el luchador
**Historia de usuario:** Como espectador, quiero ver HP y XP sobre cada luchador, para seguir el combate.

**Criterios de aceptación**
1. El sistema DEBE dibujar la barra de vida y, justo debajo, la barra de XP del nivel actual (`xp / xpForNext(nivel)`).
2. El sistema DEBE mostrar nombre y nivel del luchador.

### HU-ARE-05 — Hitboxes de depuración
**Historia de usuario:** Como desarrollador, quiero activar un overlay de hitboxes, para comprobar que lo que se ve coincide con lo que golpea.

**Criterios de aceptación**
1. CUANDO se activa **Mostrar hitboxes**, el sistema DEBE dibujar: círculo cian de radio 12 px (cuerpo/rayos), círculo coral de 21 px (proyectil) y círculo ámbar de 29 px (proximidad de duelo, 58 px entre centros).
2. CUANDO se desactiva, el sistema DEBE dejar de dibujarlas sin afectar la simulación.

### HU-ARE-06 — Seleccionar un luchador con clic
**Historia de usuario:** Como operador, quiero hacer clic en un luchador del canvas, para inspeccionar sus atributos.

**Criterios de aceptación**
1. CUANDO se hace clic en el canvas, el sistema DEBE seleccionar el luchador más cercano al punto `(x, y)` convertido a coordenadas lógicas.
2. **Defecto conocido:** el código actual compara `f.y − x` en lugar de `f.y − y` (`game/arena.js`), por lo que la selección vertical falla. Ver tarea 2.1.

### HU-ARE-07 — Escena vertical 9:16 (pendiente)
**Historia de usuario:** Como streamer de TikTok, quiero la arena en formato vertical, para ocupar toda la pantalla del móvil.

**Criterios de aceptación**
1. DONDE se configure el modo vertical, el sistema DEBE usar un canvas lógico `540 × 960`.
2. CUANDO se abre con `?stream=1`, el sistema DEBE ocultar encabezado, leyenda y pie para dejar solo el canvas.
3. **Estado:** descrito en `contexto-proyecto/` como trabajo local; no está en el repositorio.
