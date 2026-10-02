# Ki Arena — especificación del proyecto

**Estado:** prototipo web funcional. La arena, sus controles y la persistencia básica están implementados. La conexión de chat de Twitch, autenticación y autoridad de combate en servidor siguen pendientes.

## 1. Objetivo

Ki Arena es una arena 2D de combate continuo pensada para verse durante un stream. Los luchadores recorren un mapa con movimiento lineal y rebotan en sus bordes. Si dos luchadores se acercan, realizan un duelo cuerpo a cuerpo automático. Los poderes especiales se activan mediante letras enviadas en el chat de la arena. Los usuarios mantienen una identidad y progreso RPG guardados en Firestore.

La temática usa razas y poderes inspirados en Dragon Ball. Es un prototipo y no pretende ser una simulación competitiva autoritativa.

## 2. Ciclo de juego

1. La página carga el mapa, sprites, configuración del entorno y perfiles vivos de Firestore.
2. Cada luchador se mueve con una velocidad propia y rebota al alcanzar los límites del canvas.
3. Al acercarse a menos de aproximadamente 58 píxeles, dos luchadores vivos entran en una secuencia animada de golpes y patadas.
4. El combate cuerpo a cuerpo aplica daño físico. El ki no se dispara automáticamente por proximidad.
5. Una persona entra con `E`; los poderes se lanzan con `V`, `M` o `K` según disponibilidad.
6. Una baja otorga XP al atacante, actualiza sus atributos y guarda el resultado en Firestore.
7. Si solo queda un luchador, la simulación continúa y ese luchador sigue rebotando por la arena.

## 3. Mapa, cámara y animación

- El escenario principal es la Isla Kame como imagen de fondo.
- El canvas lógico mide `900 × 540`; el diseño CSS adapta su ancho a la página.
- La velocidad horizontal y vertical se conserva al rebotar contra los límites; el juego no usa navegación con pathfinding.
- El sprite cambia de cuadro durante vuelo, combate y preparación de poderes. El tamaño de renderizado usa una escala reducida respecto de las poses base.
- Cada personaje muestra aura que aumenta con el nivel: el tono progresa de verde en nivel bajo a rojo en nivel alto y el radio también crece.
- Kamehameha, Makankosappo y Rayo Mortal tienen estados de preparación y cuadros de animación propios. Durante la preparación y lanzamiento, el luchador se mantiene quieto. El Rayo Mortal sale desde la mano que apunta y se representa como un haz fino magenta con centro luminoso.

## 4. Razas y entrada de usuarios

Razas disponibles: **Saiyajin**, **Namekuseijin**, **Humano** y **Freezer**. La primera entrada de un nombre nuevo asigna una de las cuatro razas al azar. La raza asignada se persiste y se conserva en entradas futuras.

El nombre normalizado en minúsculas es la clave única del jugador. Se aceptan entre 3 y 24 caracteres: letras ASCII, números, punto, guion y guion bajo. No se crea un segundo perfil para el mismo nombre ignorando mayúsculas/minúsculas.

- `E` crea el perfil nuevo en nivel 1 o agrega a la arena el perfil guardado.
- Si ya está vivo, el intento se rechaza como duplicado.
- Si el perfil estaba eliminado, vuelve a la arena con su raza, nivel, XP y bajas conservadas; su HP se restaura según el nivel.
- La lista muestra jugadores cargados desde Firestore, botón individual de ingreso y **Agregar todos** para perfiles pendientes. El control **Elegir** de cada fila copia ese nombre al campo de usuario del chat; el resaltado indica quién enviará los próximos comandos. Elegir identidad para el chat es independiente de inspeccionar atributos.
- No se crean luchadores iniciales de CPU como participantes nuevos por defecto. Un perfil vivo de Firestore puede volver a aparecer al abrir la arena.

## 5. Combate y daño

Los golpes y patadas se resuelven en duelos animados de dos personajes. Cada golpe puede evadirse según la defensa física. Los disparos especiales se originan manualmente; el prototipo no lanza ráfagas de ki automáticas al entrar.

Los tres rayos son horizontales. Usan el signo de la velocidad X del personaje para decidir hacia qué lado salen, conservando su línea Y. El Rayo Mortal de Freezer es un láser magenta delgado que parte de la mano extendida. Cada rayo puede dañar a varios luchadores que intersecten su recorrido, una sola vez por rayo.

La mitigación implementada para ataques usa una base mínima de 4 puntos:

```text
daño recibido = max(4, daño bruto - defensa relevante × 0.45)
```

Los ataques de ki consultan defensa de ki; los golpes físicos consultan defensa física. Las fórmulas de las técnicas escalan con nivel y ataque de ki. Para Freezer se definen perfiles particulares de grosor y daño por técnica; esta regla especial no se aplica globalmente a las demás razas.

## 6. Progresión RPG y estadísticas

El nivel está limitado a **1–100**. Los atributos se derivan del nivel `L` (`g = L − 1`) y no se guardan como campos independientes:

| Atributo | Fórmula actual |
|---|---:|
| Vida máxima | `100 + 4g` |
| Ataque físico | `9 + 1.35g` |
| Defensa física | `5 + 0.7g` |
| Ataque de ki | `12 + 1.4g` |
| Defensa de ki | `5 + 0.8g` |

Una baja da al atacante `100 + round(nivel del rival × 4)` XP. Para avanzar desde el nivel `L` se requieren `round(100 + 24L + 1.3L²)` XP. El excedente se consume en una subida y puede permitir más de un nivel si alcanza. Al llegar a nivel 100, la XP se fija en cero.

La interfaz muestra una barra de XP inmediatamente debajo de la barra de vida sobre el luchador, más el nivel, las bajas y las estadísticas al seleccionar un perfil.

## 7. Técnicas y comandos

| Letra | Técnica | Disponibilidad / secuencia |
|---|---|---|
| `E` | Entrar | Crea o reingresa a un perfil con nombre único. |
| `V` | Rayo Mortal | Solo Freezer; se desbloquea desde nivel 1; apunta y dispara con un dedo. |
| `M` | Makankosappo | Freezer lo desbloquea en nivel 10. Para los demás, sigue la disponibilidad actual del juego. |
| `K` | Kamehameha | Freezer lo desbloquea en nivel 20. Para los demás, sigue la disponibilidad actual del juego. |

Los poderes se envían desde el campo de chat o desde botones de simulación. El mensaje se registra y se valida que el usuario haya ingresado antes de activar una técnica. Existe enfriamiento entre lanzamientos.

### Perfiles Freezer (nivel normalizado `t = (clamp(L,1,100) − 1)/99`)

El diseño específico para Freezer cumple la proporción pedida: técnica posterior en la progresión = rayo más delgado y con mayor multiplicador de daño bruto.

| Letra | Técnica | Desbloqueo | Grosor interpolado | Multiplicador sobre ataque de ki |
|---|---|---:|---:|---:|
| `V` | Rayo Mortal | 1 | 10 → 7 | 2.6 → 3.4 |
| `M` | Makankosappo | 10 | 8 → 5 | 3.2 → 4.2 |
| `K` | Kamehameha | 20 | 6 → 3 | 5.5 → 7.0 |

Estos datos están codificados en `FREEZER_POWER_PROGRESSION` dentro de `public/src/game/arena.js`. Para otras razas se mantienen las fórmulas generales existentes: Kamehameha se ensancha y escala su daño con nivel; Makankosappo usa su propia anchura y multiplicador. No aplicar la tabla Freezer como regla universal.

## 8. Interfaz

- Encabezado Ki Arena y selector de entorno.
- Canvas del escenario y leyenda de razas. El botón **Mostrar hitboxes** activa y desactiva un overlay: cian = radio del cuerpo usado por los rayos (12 px), coral = radio usado por proyectiles (21 px), ámbar = radio por luchador para visualizar el contacto cuerpo a cuerpo (29 px cada uno; se activa al tocarse, 58 px entre centros). Desactivado inicialmente.
- Chat de arena colocado debajo del juego; incluye campo de usuario, campo de mensaje y botones de prueba para `E/K/M/V`.
- Panel de luchadores con nivel, bajas, XP, KO e ingreso individual; control para agregar pendientes.
- Panel de atributos del jugador seleccionado y registro de combate.
- El juego no tiene botón de reinicio de partida: la arena es continua.

## 9. Límites y estado pendiente

- La integración con Twitch no lee chats reales todavía; existe solamente el punto de arquitectura y su plan.
- Usuarios se identifican por nombre normalizado, no por Twitch OAuth o ID externo todavía.
- Dev, QA y prod son namespaces de colecciones en el mismo Firebase; no separan reglas, cuotas o facturación.
- La simulación y la asignación de daño corren en el navegador; un cliente manipulado podría falsificar progreso mientras las reglas actuales lo permitan.
- No hay autenticación ni lógica autoritativa de XP/KO en Cloud Functions implementada.
- No se ha verificado un despliegue de la nueva estructura a Firebase Hosting.
- La física es arcade de movimiento lineal/rebote, no una colisión física realista.
