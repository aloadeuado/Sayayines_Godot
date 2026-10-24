# Requisitos — Persistencia en Firestore y entornos

## Introducción

Firestore es la única fuente de verdad para perfiles, mensajes, eventos y ajustes. El navegador accede por REST. Los entornos son prefijos lógicos dentro del proyecto `sayayin-c0dfe`. Reglas obligatorias de `.kiro/steering/reglas-datos.md`: campos base `id`/`reference`/`isActive` con borrado suave y entorno `APP_ENV` = `dev|qa|prd`.

## Requisitos

### HU-FS-01 — Entorno por variable `APP_ENV`
**Historia de usuario:** Como dueño del juego, quiero que el entorno salga de una variable con los valores `dev`, `qa` y `prd`, para que cada despliegue apunte siempre a sus datos.

**Criterios de aceptación**
1. El sistema DEBE leer el entorno de `APP_ENV` y aceptar solo `dev`, `qa`, `prd`.
2. SI `APP_ENV` falta o es inválido, ENTONCES el sistema DEBE mostrar un error visible (en local puede usar `dev`).
3. Un único módulo DEBE construir todas las rutas; ningún otro archivo DEBE escribir `environments/…` a mano.
4. El sistema DEBE usar las rutas `environments/{APP_ENV}/kiArenaPlayers`, `…/kiArenaMessages`, `…/kiArenaEvents` y `environments/{APP_ENV}/kiArenaSettings/gameplay`.
5. **Estado actual del código:** usa `?env=dev|qa|prod` en la URL; ver tareas 3.x.
6. La documentación NO DEBE describir los entornos como aislamiento de seguridad, cuota o facturación.
7. (Pedro, 2026-10-24) La estructura DEBE ser: colección raíz `environments` → un documento por entorno (`dev`, `qa`, `prd`) → todas las colecciones de la app dentro de ese documento. Cada documento de entorno es una base de datos completa; ninguna colección de la app DEBE vivir fuera de `environments/{APP_ENV}/`. Aplica a todos los modelos.

### HU-FS-02 — Perfil de jugador
**Historia de usuario:** Como jugador, quiero que mi progreso quede guardado, para no perderlo entre sesiones.

**Criterios de aceptación**
1. El sistema DEBE guardar el perfil en `kiArenaPlayers/{usernameKey}` con `id, reference, isActive, username, usernameKey, race, level, xp, kills, deaths, alive, hp, maxHp, hpFormulaVersion, schemaVersion 2, updatedAt`.
2. Al guardar, el sistema DEBE normalizar: `level ∈ [1,100]`, `xp, kills, deaths, hp ≥ 0`, `maxHp ≥ 1`.
3. CUANDO un perfil no existe (404), `get` DEBE devolver `null` sin lanzar error.

### HU-FS-03 — Mensajes y eventos
**Historia de usuario:** Como operador, quiero un registro del chat y del combate.

**Criterios de aceptación**
1. `addMessage` DEBE truncar el texto a 120 caracteres, guardar `command` si el texto completo es `E/K/M/V` y devolver el ID del documento.
2. `listMessages` DEBE devolver los últimos 50 por `createdAt` desc, en orden ascendente.
3. `addEvent(type, datos)` DEBE guardar eventos; una baja usa `type: knockout` con `victim` y `killer`.

### HU-FS-04 — Sin almacenamiento local como verdad
**Criterios de aceptación**
1. El sistema NO DEBE usar `localStorage` ni `sessionStorage` para jugadores, chat, settings ni progreso.
2. Posiciones, animaciones y proyectiles DEBEN vivir solo en memoria.

### HU-FS-05 — Errores visibles
**Criterios de aceptación**
1. Cada petición DEBE abortarse a los 10 s.
2. Al iniciar, `health()` DEBE mostrar «Guardado en Firebase · ENV · proyecto» o «Firebase sin conexión: …» en `#firebase-status`.
3. SI falla un guardado, ENTONCES el sistema DEBE mostrar «Error guardando en Firebase: …» sin detener la arena.

### HU-FS-06 — Pruebas seguras
**Criterios de aceptación**
1. Ningún agente DEBE escribir, borrar ni migrar datos reales para probar; solo lecturas de consulta, `qa` o Emulator Suite con autorización.

### HU-FS-07 — Campos base opcionales en todo modelo
**Historia de usuario:** Como dueño del juego, quiero que todo registro nuevo tenga `id`, `reference` e `isActive`, sin que los registros antiguos que no los tienen causen conflictos.

**Criterios de aceptación**
1. CUANDO se crea cualquier documento (jugador, mensaje, evento, ajustes), el sistema DEBE escribir `id` (= ID del documento), `reference` (referencia Firestore completa del documento, incluido `environments/{APP_ENV}`) e `isActive: true`.
1b. Toda relación entre modelos DEBE guardarse como referencia completa del mismo entorno (`playerRef`, `victimRef`, `killerRef`), nunca como ID suelto.
1c. SI una referencia apunta a otro entorno, ENTONCES el sistema DEBE rechazarla.
2. Los tres atributos DEBEN ser opcionales en el modelo: SI faltan, ENTONCES el sistema DEBE leer el registro sin error (`id` ← ID del documento, `reference` vacío, `isActive` ← `true`).
3. CUANDO se actualiza un documento antiguo, el sistema PUEDE completar los que falten y NO DEBE cambiar un `isActive` existente.
4. `reference` NO DEBE cambiar después de creada.

### HU-FS-08 — Borrado suave
**Historia de usuario:** Como dueño del juego, quiero que nada se borre de verdad, para poder recuperar cualquier registro.

**Criterios de aceptación**
1. El adaptador NO DEBE exponer ni usar `DELETE` sobre documentos o colecciones.
2. CUANDO se borra o elimina un registro, el sistema DEBE hacer `PATCH isActive=false` y actualizar `updatedAt`.
3. Las lecturas (`get`, `listPlayers`, `listMessages`, `listEvents`, `getSettings`) DEBEN ignorar registros con `isActive === false`.
4. Un registro sin `isActive` DEBE tratarse siempre como activo.
5. `isActive` y `alive` DEBEN tratarse como campos distintos.

### HU-FS-09 — Catálogo de razas `kiArenaRaces` · PROPUESTA (Pedro, 2026-10-24)
**Historia de usuario:** Como administrador, quiero las razas en su propia colección con sus características, para balancearlas sin tocar código.

**Criterios de aceptación**
1. El sistema DEBE guardar cada raza en `environments/{APP_ENV}/kiArenaRaces/{code}` con `code` ∈ `saiyajin`, `namekuseijin`, `terricola`, `freezer` y los campos base `id`, `reference`, `isActive`.
2. Cada raza DEBE tener `stats.ki`, `stats.physicalAttack`, `stats.physicalDefense`, `stats.kiDefense` (multiplicadores, 1.0 = normal) y `utility` con `code`, `name`, `description` y `params` (map editable).
3. Una raza con `isActive === false` NO DEBE asignarse a tipos ni jugadores nuevos; los existentes la siguen leyendo.
4. Valores iniciales y utilidades: ver `design.md` y HU-RPG-06/07.

### HU-FS-10 — Catálogo de tipos de personaje `kiArenaPlayerTypes` · PROPUESTA (Pedro, 2026-10-24)
**Historia de usuario:** Como administrador, quiero un catálogo de personajes (Goku, Piccolo, Gohan, Freezer) ligado a su raza, para añadir personajes nuevos sin cambiar código.

**Criterios de aceptación**
1. El sistema DEBE guardar cada tipo en `environments/{APP_ENV}/kiArenaPlayerTypes/{code}` con `code`, `name`, `raceRef` (referencia completa a `kiArenaRaces`), `legacyRace` (0–3, opcional), `isEligible`, `spriteKey` y `order` opcionales, y los campos base.
2. `CHARACTER_OPTIONS` y `settings.characters` DEBEN reemplazarse por la lectura de este catálogo.
3. Relación: una raza tiene N tipos; un tipo tiene una raza.

### HU-FS-11 — Personajes de usuario (`kiArenaPlayers` como tabla intermedia) · PROPUESTA (Pedro, 2026-10-24)
**Historia de usuario:** Como jugador con cuenta, quiero tener uno o varios personajes con su nombre y progreso, para jugar con distintos personajes.

**Criterios de aceptación**
1. `kiArenaPlayers` DEBE ser la tabla intermedia muchos a muchos entre `kiArenaUsers` y `kiArenaPlayerTypes`: un usuario tiene N personajes y un tipo lo tienen N usuarios.
2. Cada personaje DEBE guardar `userRef` (opcional para jugadores de chat sin cuenta), `playerTypeRef`, `name`, `nameKey`, el progreso (`level`, `xp`, `kills`, `deaths`, `alive`, `hp`, `maxHp`), `utilityState` (map opcional), `schemaVersion 3` y los campos base.
3. El `id` DEBE ser `{userId}:{code}` para jugadores con cuenta; los de chat sin cuenta conservan `usernameKey`.
4. SI un documento no tiene `playerTypeRef`, ENTONCES el sistema DEBE resolver el tipo por `race` → `legacyRace` y completar `playerTypeRef` al volver a guardar, sin borrar `race`.
5. `kiArenaUsers` DEBE tener `playerRefs[]` y `primaryPlayerRef` (ver HU-AUT-09).
6. **Pregunta abierta:** ¿puede un usuario tener dos personajes del mismo tipo? Con el id propuesto, no.

### HU-FS-12 — Eventos de combate `kiArenaEvents` (Pedro, 2026-10-24)
**Historia de usuario:** Como operador, quiero un historial de combate con referencias a los personajes, para mostrar el feed y auditar resultados.

**Criterios de aceptación**
1. **Estado actual:** solo existe `type: 'knockout'`, con `killer` y `victim` como texto y `createdAt`; lo escribe `arena.js` al llegar a 0 de vida, y `/bot` lee los últimos 30 para el feed.
2. El evento DEBE añadir `killerRef` y `victimRef` (referencias completas a `kiArenaPlayers`) y los campos base; `killer`/`victim` se conservan solo para mostrar.
3. El evento PUEDE añadir `power` (`K`, `M`, `V` o físico) y `xpGained` (propuesta pendiente de aprobación).
4. Los eventos NO DEBEN usarse como fuente de `kills`/`deaths`: la verdad está en el personaje.
5. Un fallo al guardar un evento NO DEBE ser silencioso: DEBE registrarse en el estado de Firebase.
6. **Pendiente de decidir:** la colección crece sin límite (no se borra nada); definir resumen o archivo de eventos viejos.
