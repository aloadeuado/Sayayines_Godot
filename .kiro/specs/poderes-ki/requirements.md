# Requisitos — Poderes de ki (`V`, `M`, `K`)

## Introducción

Los poderes se lanzan con una letra del chat. Cada uno tiene requisito de raza/nivel, enfriamiento, una preparación animada durante la cual el luchador queda quieto, y un rayo horizontal que puede dañar una vez a cada luchador que cruce. El daño escala con el ataque de ki y una curva por nivel editable en Settings.

## Requisitos

### HU-POD-01 — Desbloqueo por raza y nivel
**Historia de usuario:** Como jugador, quiero que los poderes se desbloqueen al subir de nivel, para tener una meta de progreso.

**Criterios de aceptación**
1. El sistema DEBE permitir `V` solo a la raza Freezer (`race 3`) desde nivel 1.
2. El sistema DEBE permitir `M` a todas las razas desde nivel 10 y `K` desde nivel 20.
3. SI el poder está bloqueado, ENTONCES el sistema DEBE responder con el motivo de `powerBlockReason` (p. ej., «Makankosappo requiere nivel 10; tu nivel actual es 6.») y NO DEBE lanzar otro poder en su lugar.
4. El sistema DEBE validar el bloqueo en `/bot` antes de guardar el mensaje y otra vez en la arena al ejecutarlo.
5. SI la persona no ha entrado con `E`, ENTONCES `/bot` DEBE rechazar el poder con «debe ingresar con E antes de usar poderes».

### HU-POD-02 — Enfriamiento y exclusión
**Historia de usuario:** Como operador, quiero que no se puedan encadenar poderes sin pausa, para que el spam del chat no rompa el balance.

**Criterios de aceptación**
1. El sistema DEBE aplicar enfriamientos de 1.8 s a `V`, 7 s a `M` y 3.8 s a `K`, contados desde el inicio de la preparación.
2. MIENTRAS un luchador prepara o lanza un poder, el sistema DEBE rechazar cualquier otro poder con «<Poder> no disponible ahora.».
3. MIENTRAS un luchador prepara o lanza un poder, el sistema NO DEBE moverlo.

### HU-POD-03 — Preparación animada
**Historia de usuario:** Como espectador, quiero ver la pose de carga antes del disparo, para anticipar el ataque.

**Criterios de aceptación**
1. `K` DEBE pasar por `charge` 0.55 s → `thrust` 0.22 s → `fire` 0.82 s.
2. `M` DEBE pasar por `focus` 0.62 s → `aim` 0.24 s → `fire` 0.95 s.
3. `V` DEBE pasar por `focus` 0.24 s → `fire` 0.4 s y salir desde la mano que apunta (12 px por encima del centro).

### HU-POD-04 — Rayo horizontal multiobjetivo
**Historia de usuario:** Como jugador, quiero que mi rayo dañe a todos los que atraviese, para que valga la pena apuntar.

**Criterios de aceptación**
1. El rayo DEBE salir horizontal hacia el signo de `vx` del lanzador (derecha si `vx = 0`).
2. El rayo DEBE crecer a 1100 px/s (`K`), 1650 px/s (`M`) o 2200 px/s (`V`) hasta 760, 780 u 820 px.
3. CUANDO un luchador vivo distinto del lanzador queda dentro del radio lateral del rayo y en su recorrido, el sistema DEBE dañarlo **una sola vez por rayo**.
4. El daño DEBE usar defensa de ki: `max(4, bruto − defensaKi × 0.45)`.

### HU-POD-05 — Daño escalado por nivel
**Historia de usuario:** Como administrador, quiero configurar cuánto pega cada poder por nivel, para balancear sin tocar código.

**Criterios de aceptación**
1. El daño bruto DEBE ser `AtaqueKi(N) × M_poder(N)` con `M_poder(N) = inicio + (fin − inicio) × (N − 1)/99`.
2. DONDE el lanzador es Freezer, el sistema DEBE usar las curvas `powers.freezer` (`deathRay`, `makankosappo`, `kamehameha`); en otro caso, `powers.generic`.
3. Defaults genéricos: Kamehameha 1.9 → 4.4, Makankosappo 3.2 → 8.5. Freezer: Rayo Mortal 2.6 → 3.4, Makankosappo 3.2 → 4.2, Kamehameha 5.5 → 7.

### HU-POD-06 — Anchura visible coherente con la hitbox
**Historia de usuario:** Como espectador, quiero que el rayo golpee lo que se ve, para que el combate sea justo.

**Criterios de aceptación**
1. DONDE el lanzador no es Freezer, la anchura DEBE ser `30 + t × 56` (Kamehameha) y `10 + t × 58` (Makankosappo), con `t = (N − 1)/99`.
2. DONDE el lanzador es Freezer, la anchura DEBE interpolar `V` 10 → 7, `M` 8 → 5, `K` 6 → 3 (técnica posterior = más delgada y más dañina).
3. El radio de impacto DEBE derivarse de la misma anchura que se dibuja.
4. **Pendiente de revisar:** el radio de Kamehameha suma 12 px extra (`ancho × 0.675 + 12 + 12`) respecto de Makankosappo y Rayo Mortal (`ancho × 0.5 + 12`). Ver tarea 2.2.

### HU-POD-07 — Poderes del catálogo no implementados
**Historia de usuario:** Como administrador, quiero ver qué poderes están planeados, sin que afecten el combate.

**Criterios de aceptación**
1. Settings DEBE listar Golpe de ki, Destello final, Mafuba y Bola mortal como «Aún no implementado en combate».
2. Un poder pendiente NO DEBE tener comando ni participar en daño.

### HU-POD-08 — Modelo de datos actual de los poderes (estado, Pedro, 2026-10-24)
**Historia de usuario:** Como administrador, quiero saber dónde está definido cada dato de los poderes, para decidir qué pasa a Firestore.

**Criterios de aceptación**
1. **Estado actual:** los poderes NO son una colección. La curva de multiplicador (`start` en nivel 1, `end` en nivel 100) vive en `environments/{APP_ENV}/kiArenaSettings/gameplay` → `settingsJson.powers`, agrupada por raza: `generic` (todas las demás) y `freezer`.
2. Nivel de desbloqueo, enfriamiento, anchura del rayo y la restricción «Rayo Mortal solo Freezer» están fijos en código (`POWER_UNLOCK_LEVELS`, `launch*`, `FREEZER_POWER_PROGRESSION`, `race === 3`).
3. Golpe de ki, Destello final, Mafuba y Bola mortal existen solo como valor `1` en `powers.pending`, sin comando ni acción.
4. **Próximo paso (pendiente de Pedro):** catálogo `kiArenaPowers` con relación a `kiArenaRaces`, siguiendo el mismo patrón que razas y tipos.

### HU-POD-09 — Catálogo de poderes por raza `kiArenaPowers` · IMPLEMENTADO (2026-10-24)
**Historia de usuario:** Como administrador, quiero que cada poder sea un registro ligado a una raza, con sus multiplicadores, para balancear y añadir poderes sin tocar código.

**Criterios de aceptación**
1. El sistema DEBE guardar cada poder en `environments/{APP_ENV}/kiArenaPowers/{raceCode}_{powerCode}` con los campos base, `code`, `name`, `description`, `command`, `raceRef` (referencia completa a `kiArenaRaces`), `unlockLevel` y `cooldownSeconds`.
2. Cada poder DEBE tener `multipliers.ki`, `multipliers.physicalAttack`, `multipliers.kiDefense`, `multipliers.physicalDefense`, `multipliers.sizeY` y (si crece a lo ancho) `multipliers.sizeX`, cada uno con `start` (nivel 1) y `end` (nivel 100); los que falten valen 1.
2b. (Pedro, 2026-10-24) El tamaño en el eje Y DEBE ser `baseSizeY × multipliers.sizeY(N)` y crecer con el nivel; la hitbox (incluida la onda sólida `full`) DEBE usar ese tamaño.
2c. (Pedro, 2026-10-24) Las áreas y explosiones (Genkidama, Explosión Final, Bola Mortal…), los físicos y los de control DEBEN crecer también en el eje X: `baseSizeX × multipliers.sizeX(N)`. Los rayos (`kiBeam`, con izquierda y derecha) NO DEBEN tener eje X.
2d. (Pedro, 2026-10-24) El catálogo DEBE incluir los poderes de la saga que faltaban (Explosión Final, Burning Attack, Súper Saiyajin, Teletransportación, Granada de Luz, Makosen, Rayo de los Ojos, Rayo Dodon, Sokidan, Multiforma, Zanzoken, Nova Strike): 57 registros, sembrados en dev.
3. Un personaje DEBE poder usar solo los poderes activos de su raza con `unlockLevel ≤ level`; `powerBlockReason` DEBE leer este catálogo en lugar de `POWER_UNLOCK_LEVELS` y `race === 3`.
4. `settingsJson.powers` y `powers.pending` DEBEN migrarse a este catálogo (copia, sin borrar, con aprobación de Pedro).

### HU-POD-10 — Utilidad de daño persistente (onda expansiva) · IMPLEMENTADO (2026-10-24)
**Historia de usuario:** Como jugador, quiero que la onda de un poder como el Kamehameha sea un objeto sólido que dañe a quien quede dentro, para que los poderes grandes dominen la pantalla.

**Criterios de aceptación**
1. El poder PUEDE tener `utility.code = 'persistentDamage'` con `utility.params.hitboxMode` ∈ `front` | `full`.
2. CON `front`, solo el frente que avanza DEBE hacer daño, una vez por objetivo.
3. CON `full`, al crecer la onda el sistema DEBE crear una hitbox de toda la onda expansiva; MIENTRAS un luchador esté dentro, DEBE perder `tickDamage × daño del poder` cada `tickSeconds`, hasta `lingerSeconds` después de que la onda llegue al final.
4. La hitbox visible y la de daño DEBEN coincidir (HU-POD-06).
5. `tickDamage`, `tickSeconds` y `lingerSeconds` DEBEN ser editables por poder desde settings.

### HU-POD-11 — Poderes de cada personaje `kiArenaPlayerPowers` · IMPLEMENTADO (2026-10-24)
**Historia de usuario:** Como jugador, quiero que mi personaje tenga su propia lista de poderes, para que los poderes se ganen y se puedan dar o quitar uno por uno.

**Criterios de aceptación**
1. `kiArenaPlayerPowers` DEBE ser la tabla intermedia muchos a muchos entre `kiArenaPlayers` y `kiArenaPowers`, con id `{playerId}:{powerId}`, `playerRef`, `powerRef`, `unlockedAt` y los campos base.
2. CUANDO un personaje alcanza el `unlockLevel` de un poder activo de su raza, el sistema DEBE crear su fila con `source: 'level'` (sin duplicar si ya existe).
3. Un personaje DEBE poder lanzar solo los poderes con fila activa; quitar un poder es `isActive=false`.
4. Un operador PUEDE dar un poder de otra raza (`source: 'admin'`).
5. El sistema DEBE sumar `timesUsed` y, en una derrota con ese poder, `kills`, y actualizar `lastUsedAt`.
6. Personajes antiguos sin filas DEBEN recibirlas al cargar según su nivel y raza (sin backfill masivo obligatorio).

**Estado (2026-10-24):** HU-POD-09, 10 y 11 implementadas en la rama `claude/project-thread-osowq6` (`public/src/config/game-catalog.js`, `game/arena.js`, `app/settings-app.js`, `functions/scripts/migrate-character-model.js`). 42 registros de poder (28 poderes distintos por raza); solo los de mecánica `kamehameha`, `makankosappo` y `deathRay` están activos en combate, el resto queda con `status: 'pending'` hasta tener su animación y hitbox.
