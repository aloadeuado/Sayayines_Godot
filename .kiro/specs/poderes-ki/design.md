# Diseño — Poderes de ki

> **Rutas Firestore (obligatorio):** todo modelo de este módulo vive en `environments/{APP_ENV}/{colección}/{id}`: colección raíz `environments`, un documento por entorno (`dev`, `qa`, `prd`) y dentro todas las colecciones. Cualquier ruta abreviada en este archivo (`kiArenaX/{id}`) cuelga de ese prefijo. Ver `.kiro/steering/reglas-datos.md`.

## Flujo de un comando

```text
/bot sendCommand ── powerBlockReason(race, level, cmd) ── addMessage
        │                                                    │
        ▼                                                    ▼
   rechaza con motivo                       arena refreshMessages (2.5 s)
                                                     │
                                       executePower(player, cmd)
                                         ├─ powerBlockReason → chat «Sistema»
                                         ├─ cooldown/estado → «no disponible ahora»
                                         └─ launchDeathRay | launchMaka | launchKame
                                                     │  (interrumpe duelo, fija cooldown)
                                         update(): máquina de fases → fire*() → bolts.push
                                         update(): bolt crece, prueba colisión, hit(..., ki=true)
```

## Fuente única de reglas

| Qué | Dónde |
|---|---|
| Niveles de desbloqueo | `POWER_UNLOCK_LEVELS = { V: 1, M: 10, K: 20 }` en `config/gameplay-settings.js` |
| Motivo de bloqueo | `powerBlockReason(race, level, cmd)` (usado por arena y Bot) |
| Multiplicador por nivel | `powerMultiplierAtLevel(power, race, level, settings)` |
| Anchuras Freezer | `FREEZER_POWER_PROGRESSION` en `game/arena.js` |
| Anchuras genéricas | `beamWidth(f, maka)` en `game/arena.js` |
| Radios de impacto | `beamHitRadius`, `deathRayHitRadius` |
| Daño | `beamDamage`, `deathRayDamage` → `hit()` |

## Modelo de datos actual de los poderes (Pedro, 2026-10-24)

| Comando | Poder | Quién | Desbloqueo | Enfriamiento | Dónde |
|---|---|---|---|---|---|
| `V` | Rayo Mortal | Solo Freezer | nivel 1 | 1.8 s | código |
| `M` | Makankosappo | Todas | nivel 10 | 7 s | código |
| `K` | Kamehameha | Todas | nivel 20 | 3.8 s | código |

Multiplicador de ki editable en settings (`settingsJson.powers`, lineal de nivel 1 a 100):

| Grupo | Poder | `start` | `end` |
|---|---|---|---|
| `generic` | kamehameha | 1.9 | 4.4 |
| `generic` | makankosappo | 3.2 | 8.5 |
| `freezer` | deathRay | 2.6 | 3.4 |
| `freezer` | makankosappo | 3.2 | 4.2 |
| `freezer` | kamehameha | 5.5 | 7.0 |

Pendientes sin acción (`powers.pending`, valor 1): `kiBlast`, `finalFlash`, `mafuba`, `deathBall`.

La categoría hoy es por grupo de raza (`freezer` frente a `generic`, con `race === 3` fijo en código), no por poder.

## Catálogo `kiArenaPowers` (Pedro, 2026-10-24) · IMPLEMENTADO

Reemplaza `settingsJson.powers` y las constantes de código. Cada poder pertenece a **una** raza: el Kamehameha de Saiyajin y el de Freezer son documentos distintos.

### `environments/{APP_ENV}/kiArenaPowers/{raceCode}_{powerCode}`

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | string | Opcional | `{raceCode}_{powerCode}`, p. ej. `freezer_deathRay` |
| `reference` | referencia | Opcional | Referencia completa a sí mismo |
| `isActive` | boolean | Opcional | `false` = poder retirado (borrado suave); ausente = activo |
| `code` | string | Sí | `kamehameha`, `makankosappo`, `deathRay`… |
| `name` | string | Sí | Nombre visible |
| `description` | string | Sí | Qué hace |
| `command` | string | Sí | Letra del chat: `K`, `M`, `V` |
| `raceRef` | referencia | Sí | → `kiArenaRaces/{code}` |
| `unlockLevel` | number | Sí | Nivel mínimo (1–100) |
| `cooldownSeconds` | number | Sí | Enfriamiento |
| `chargeSeconds` | number | Opcional | Tiempo de carga antes de disparar |
| `multipliers.ki.start` / `.end` | number | Sí | Multiplicador de ki en nivel 1 y 100 (lineal) |
| `multipliers.physicalAttack.start` / `.end` | number | Opcional | Multiplicador de daño físico (por defecto 1) |
| `multipliers.kiDefense.start` / `.end` | number | Opcional | Multiplicador de defensa de ki mientras dura el poder (por defecto 1) |
| `multipliers.physicalDefense.start` / `.end` | number | Opcional | Multiplicador de defensa física mientras dura el poder (por defecto 1) |
| `baseSizeY` | number | Opcional | Tamaño base en el eje Y (grosor del rayo o alto del área), en px. Documentos viejos: `baseSize` |
| `multipliers.sizeY.start` / `.end` | number | Opcional | Multiplicador del tamaño en Y en nivel 1 y 100: alto(N) = `baseSizeY × sizeY(N)`. La hitbox crece con él. Documentos viejos: `multipliers.size` |
| `baseSizeX` | number | Opcional | Tamaño base en el eje X (ancho), en px. Solo áreas, explosiones, físicos y control; los rayos no lo tienen |
| `multipliers.sizeX.start` / `.end` | number | Opcional | Multiplicador del tamaño en X: ancho(N) = `baseSizeX × sizeX(N)`. No aplica a rayos |
| `utility.code` | string | Opcional | `persistentDamage` |
| `utility.name` / `.description` | string | Opcional | Texto visible |
| `utility.params.hitboxMode` | string | Opcional | `front` = solo el frente que avanza hace daño · `full` = toda la onda expansiva es un objeto sólido y daña a todo el que esté dentro |
| `utility.params.tickDamage` | number | Opcional | Fracción del daño del poder que se aplica por tick dentro de la onda (`full`) |
| `utility.params.tickSeconds` | number | Opcional | Cada cuánto se aplica el tick |
| `utility.params.lingerSeconds` | number | Opcional | Cuánto dura la onda después de llegar al final |
| `visual.color` / `visual.spriteKey` | string | Opcional | Tema visual del poder |
| `order` | number | Opcional | Orden en settings |
| `createdAt` / `updatedAt` | string ISO | Opcional | Fechas |

Valores iniciales (tomados del código actual; `utility` es propuesta):

| `id` | `command` | `unlockLevel` | `cooldownSeconds` | `ki.start` | `ki.end` | `hitboxMode` | `tickDamage` | `tickSeconds` | `lingerSeconds` |
|---|---|---|---|---|---|---|---|---|---|
| `saiyajin_kamehameha` (y namekuseijin, terricola) | K | 20 | 3.8 | 1.9 | 4.4 | `full` | 0.15 | 0.25 | 0.6 |
| `saiyajin_makankosappo` (y namekuseijin, terricola) | M | 10 | 7 | 3.2 | 8.5 | `front` | — | — | — |
| `freezer_deathRay` | V | 1 | 1.8 | 2.6 | 3.4 | `front` | — | — | — |
| `freezer_makankosappo` | M | 10 | 7 | 3.2 | 4.2 | `front` | — | — | — |
| `freezer_kamehameha` | K | 20 | 3.8 | 5.5 | 7.0 | `full` | 0.15 | 0.25 | 0.6 |

Relaciones:

| Desde | Campo | Hacia | Cardinalidad |
|---|---|---|---|
| `kiArenaPowers` | `raceRef` | `kiArenaRaces` | N poderes → 1 raza |
| `kiArenaEvents` | `powerRef` (propuesta) | `kiArenaPowers` | con qué poder fue la derrota |

Un personaje puede usar los poderes de su raza (`playerTypeRef → raceRef`) cuyo `unlockLevel ≤ level`. Hoy (`hitboxMode` implícito) el rayo daña una vez a cada objetivo a lo largo de todo el rayo (`b.hit`).

### Escalado del poder por nivel

Cada multiplicador es una curva `{ start, end }`: vale `start` en el nivel 1, `end` en el nivel 100 y crece en línea recta entre los dos: `m(N) = start + (end − start) × (N − 1) / 99` (`curveAt` en `game-catalog.js`).

| Paso | Fórmula | Dónde |
|---|---|---|
| 1. Stat base por nivel | `ki(N) = 12 + M_ki × (N − 1)` (igual para físico y defensas, con sus `M` de settings) | `calculateLevelStats` |
| 2. Raza | stat × `kiArenaRaces.stats.*` × (1 + Zenkai acumulado) | `calculateLevelStats(level, settings, raceStats, bonus)` |
| 3. Poder | daño = ki del personaje × `multipliers.ki(N)` del poder (× 1.25 si Freezer está transformado) | `beamDamage`, `deathRayDamage` |
| 4. Defensa del rival | daño − defensa de ki del rival × `multipliers.kiDefense(N)` de su poder activo × 0.45 (mínimo 4) | `hit()` |
| 4b. Tamaño | alto = `baseSizeY × sizeY(N)`; ancho = `baseSizeX × sizeX(N)` (solo áreas y explosiones); la hitbox usa ese tamaño | `powerSizeAt(power, N, 'y' \| 'x')`, `beamWidth`, `beamHitRadius` |
| 5. Hitbox `full` | mientras el rival siga dentro de la onda: `tickDamage` × daño cada `tickSeconds`, hasta `lingerSeconds` tras llegar al final | bucle de `bolts` en `update()` |

Las defensas de un poder (`kiDefense`, `physicalDefense`) se aplican a quien lo lanza mientras lo carga y dispara: por debajo de 1 queda más expuesto.

### Registros sembrados (57)

Los rayos (`kiBeam`) solo crecen en Y: tienen izquierda y derecha, su largo lo da la pantalla. Las áreas, explosiones, físicos y de control crecen en X y en Y.

| id | Poder | Raza | Categoría | Estado | Cmd | Nivel | Enfr. (s) | Ki | Físico | Def. ki | Def. física | Tamaño Y (base px × mult.) | Tamaño X (base px × mult.) | Hitbox / utilidad |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `saiyajin_kamehameha` | Kamehameha | saiyajin | Ki · rayo | activo | K | 20 | 3.8 | 1.9→4.4 | 1 | 0.9 | 0.9 | 30 × 1→2.87 = 30→86 px | — | **sólido** (tick 0.15 c/0.25 s, +0.6 s) |
| `namekuseijin_kamehameha` | Kamehameha | namekuseijin | Ki · rayo | activo | K | 20 | 3.8 | 1.9→4.4 | 1 | 0.9 | 0.9 | 30 × 1→2.87 = 30→86 px | — | **sólido** (tick 0.15 c/0.25 s, +0.6 s) |
| `terricola_kamehameha` | Kamehameha | terricola | Ki · rayo | activo | K | 20 | 3.8 | 1.9→4.4 | 1 | 0.9 | 0.9 | 30 × 1→2.87 = 30→86 px | — | **sólido** (tick 0.15 c/0.25 s, +0.6 s) |
| `freezer_kamehameha` | Kamehameha | freezer | Ki · rayo | activo | K | 20 | 3.8 | 5.5→7 | 1 | 0.9 | 0.9 | 6 × 1→0.5 = 6→3 px | — | **sólido** (tick 0.15 c/0.25 s, +0.6 s) |
| `saiyajin_makankosappo` | Makankosappo | saiyajin | Ki · rayo | activo | M | 10 | 7 | 3.2→8.5 | 1 | 0.8 | 0.8 | 10 × 1→6.8 = 10→68 px | — | front |
| `namekuseijin_makankosappo` | Makankosappo | namekuseijin | Ki · rayo | activo | M | 10 | 7 | 3.2→8.5 | 1 | 0.8 | 0.8 | 10 × 1→6.8 = 10→68 px | — | front |
| `terricola_makankosappo` | Makankosappo | terricola | Ki · rayo | activo | M | 10 | 7 | 3.2→8.5 | 1 | 0.8 | 0.8 | 10 × 1→6.8 = 10→68 px | — | front |
| `freezer_makankosappo` | Makankosappo | freezer | Ki · rayo | activo | M | 10 | 7 | 3.2→4.2 | 1 | 0.8 | 0.8 | 8 × 1→0.625 = 8→5 px | — | front |
| `freezer_deathRay` | Rayo Mortal | freezer | Ki · rayo | activo | V | 1 | 1.8 | 2.6→3.4 | 1 | 1 | 1 | 10 × 1→0.7 = 10→7 px | — | front |
| `saiyajin_dragonFist` | Golpe Dragón (Ryūken) | saiyajin | Físico y combos | pendiente | — | 35 | 9 | 1 | 2.5→6 | 1 | 0.9 | 30 × 1→1.5 = 30→45 px | 30 × 1→1.5 = 30→45 px | front |
| `saiyajin_meteorCombo` | Combo Meteoro | saiyajin | Físico y combos | pendiente | — | 15 | 6 | 1 | 2→5 | 1 | 1.1 | 30 × 1→1.5 = 30→45 px | 30 × 1→1.5 = 30→45 px | contact |
| `terricola_janKen` | Jan Ken | terricola | Físico y combos | pendiente | — | 5 | 4 | 1 | 1.6→3.5 | 1 | 1 | 30 × 1→1.5 = 30→45 px | 30 × 1→1.5 = 30→45 px | contact |
| `terricola_wolfFangFist` | Puño Lobo (Rōga Fūfūken) | terricola | Físico y combos | pendiente | — | 12 | 6 | 1 | 1.8→4.2 | 1 | 0.9 | 30 × 1→1.5 = 30→45 px | 30 × 1→1.5 = 30→45 px | contact |
| `namekuseijin_elasticArm` | Brazo Elástico | namekuseijin | Físico y combos | pendiente | — | 8 | 5 | 1 | 1.5→3.8 | 1 | 1.1 | 30 × 1→1.5 = 30→45 px | 30 × 1→1.5 = 30→45 px | front |
| `freezer_tailWhip` | Latigazo de Cola | freezer | Físico y combos | pendiente | — | 6 | 4 | 1 | 1.7→4 | 1 | 1 | 30 × 1→1.5 = 30→45 px | 30 × 1→1.5 = 30→45 px | area |
| `saiyajin_rush` | Embestida | saiyajin | Físico y combos | pendiente | — | 3 | 4 | 1 | 1.4→3 | 1 | 1.2 | 30 × 1→1.5 = 30→45 px | 30 × 1→1.5 = 30→45 px | contact |
| `namekuseijin_rush` | Embestida | namekuseijin | Físico y combos | pendiente | — | 3 | 4 | 1 | 1.4→3 | 1 | 1.2 | 30 × 1→1.5 = 30→45 px | 30 × 1→1.5 = 30→45 px | contact |
| `terricola_rush` | Embestida | terricola | Físico y combos | pendiente | — | 3 | 4 | 1 | 1.4→3 | 1 | 1.2 | 30 × 1→1.5 = 30→45 px | 30 × 1→1.5 = 30→45 px | contact |
| `freezer_rush` | Embestida | freezer | Físico y combos | pendiente | — | 3 | 4 | 1 | 1.4→3 | 1 | 1.2 | 30 × 1→1.5 = 30→45 px | 30 × 1→1.5 = 30→45 px | contact |
| `saiyajin_galickGun` | Galick Gun | saiyajin | Ki · rayo | pendiente | — | 25 | 5 | 2.2→5 | 1 | 0.9 | 0.9 | 24 × 1→2.5 = 24→60 px | — | **sólido** (tick 0.15 c/0.25 s, +0.6 s) |
| `saiyajin_finalFlash` | Final Flash | saiyajin | Ki · rayo | pendiente | — | 60 | 14 | 3.5→9 | 1 | 0.6 | 0.6 | 40 × 1→3.5 = 40→140 px | — | **sólido** (tick 0.15 c/0.25 s, +0.6 s) |
| `terricola_masenko` | Masenko | terricola | Ki · rayo | pendiente | — | 18 | 4.5 | 2→4.6 | 1 | 1 | 1 | 24 × 1→2.5 = 24→60 px | — | front |
| `terricola_triBeam` | Kikōhō (Tri-Beam) | terricola | Ki · área | pendiente | — | 40 | 10 | 3→7 | 1 | 0.8 | 0.8 | 60 × 1→2.5 = 60→150 px | 60 × 1→2.5 = 60→150 px | Sacrificio selfHpCost:0.1 |
| `saiyajin_spiritBomb` | Genkidama | saiyajin | Ki · área | pendiente | — | 80 | 30 | 4→10 | 1 | 0.5 | 0.5 | 80 × 1→4 = 80→320 px | 80 × 1→4 = 80→320 px | Energía del chat bonusPerMessage:0.02, maxBonus:1 |
| `saiyajin_bigBangAttack` | Big Bang Attack | saiyajin | Ki · área | pendiente | — | 45 | 9 | 2.8→6.5 | 1 | 0.9 | 0.9 | 60 × 1→2.5 = 60→150 px | 60 × 1→2.5 = 60→150 px | area |
| `freezer_deathBall` | Bola Mortal (Supernova) | freezer | Ki · área | pendiente | — | 70 | 25 | 3.8→9.5 | 1 | 0.6 | 0.6 | 70 × 1→4 = 70→280 px | 70 × 1→4 = 70→280 px | area |
| `namekuseijin_hellzoneGrenade` | Granada Infernal | namekuseijin | Ki · área | pendiente | — | 30 | 10 | 2.4→5.8 | 1 | 1 | 1 | 60 × 1→2.5 = 60→150 px | 60 × 1→2.5 = 60→150 px | area |
| `saiyajin_kiBlast` | Ráfaga de Ki | saiyajin | Ki · rayo | pendiente | B | 1 | 2.5 | 1.2→2.6 | 1 | 1 | 1 | 24 × 1→2.5 = 24→60 px | — | front |
| `namekuseijin_kiBlast` | Ráfaga de Ki | namekuseijin | Ki · rayo | pendiente | B | 1 | 2.5 | 1.2→2.6 | 1 | 1 | 1 | 24 × 1→2.5 = 24→60 px | — | front |
| `terricola_kiBlast` | Ráfaga de Ki | terricola | Ki · rayo | pendiente | B | 1 | 2.5 | 1.2→2.6 | 1 | 1 | 1 | 24 × 1→2.5 = 24→60 px | — | front |
| `freezer_kiBlast` | Ráfaga de Ki | freezer | Ki · rayo | pendiente | B | 1 | 2.5 | 1.2→2.6 | 1 | 1 | 1 | 24 × 1→2.5 = 24→60 px | — | front |
| `saiyajin_explosiveWave` | Onda Explosiva | saiyajin | Ki · área | pendiente | — | 22 | 8 | 1.5→3.2 | 1 | 1.2 | 1.2 | 60 × 1→2.5 = 60→150 px | 60 × 1→2.5 = 60→150 px | area |
| `namekuseijin_explosiveWave` | Onda Explosiva | namekuseijin | Ki · área | pendiente | — | 22 | 8 | 1.5→3.2 | 1 | 1.2 | 1.2 | 60 × 1→2.5 = 60→150 px | 60 × 1→2.5 = 60→150 px | area |
| `terricola_explosiveWave` | Onda Explosiva | terricola | Ki · área | pendiente | — | 22 | 8 | 1.5→3.2 | 1 | 1.2 | 1.2 | 60 × 1→2.5 = 60→150 px | 60 × 1→2.5 = 60→150 px | area |
| `freezer_explosiveWave` | Onda Explosiva | freezer | Ki · área | pendiente | — | 22 | 8 | 1.5→3.2 | 1 | 1.2 | 1.2 | 60 × 1→2.5 = 60→150 px | 60 × 1→2.5 = 60→150 px | area |
| `terricola_destructoDisc` | Kienzan | terricola | Ki · rayo | pendiente | — | 28 | 8 | 2.5→6 | 1 | 1 | 1 | 24 × 1→2.5 = 24→60 px | — | Corte ignorePhysicalDefense:1 |
| `freezer_deathSaucer` | Disco Mortal | freezer | Ki · rayo | pendiente | — | 35 | 9 | 2.2→5.2 | 1 | 1 | 1 | 24 × 1→2.5 = 24→60 px | — | front |
| `terricola_solarFlare` | Taiyōken | terricola | Control | pendiente | — | 10 | 15 | 0 | 1 | 1 | 1 | 40 × 1→1.5 = 40→60 px | 40 × 1→1.5 = 40→60 px | Ceguera durationSeconds:2, radius:160 |
| `terricola_mafuba` | Mafūba | terricola | Control | pendiente | — | 75 | 40 | 0 | 1 | 0.5 | 0.5 | 40 × 1→1.5 = 40→60 px | 40 × 1→1.5 = 40→60 px | Sello durationSeconds:5, selfHpCost:0.35 |
| `freezer_telekinesis` | Telequinesis | freezer | Control | pendiente | — | 15 | 10 | 0.8→1.8 | 1 | 1 | 1 | 40 × 1→1.5 = 40→60 px | 40 × 1→1.5 = 40→60 px | Inmovilizar durationSeconds:1.5 |
| `saiyajin_kaioken` | Kaiōken | saiyajin | Mejora | pendiente | — | 30 | 20 | 1.3→2 | 1.3→2 | 0.8 | 0.8 | — | — | Aumento durationSeconds:8, hpCostPerSecond:0.02 |
| `terricola_kaioken` | Kaiōken | terricola | Mejora | pendiente | — | 30 | 20 | 1.3→2 | 1.3→2 | 0.8 | 0.8 | — | — | Aumento durationSeconds:8, hpCostPerSecond:0.02 |
| `saiyajin_finalExplosion` | Explosión Final | saiyajin | Ki · área | pendiente | — | 85 | 60 | 5→12 | 1 | 0.3 | 0.3 | 120 × 1→4 = 120→480 px | 120 × 1→4 = 120→480 px | Sacrificio selfHpCost:0.8 |
| `saiyajin_burningAttack` | Burning Attack | saiyajin | Ki · área | pendiente | — | 32 | 8 | 2.4→5.5 | 1 | 1 | 1 | 50 × 1→2.5 = 50→125 px | 50 × 1→2.5 = 50→125 px | area |
| `saiyajin_superSaiyan` | Super Saiyajin | saiyajin | Mejora | pendiente | — | 50 | 60 | 1.5→2.5 | 1.5→2.5 | 1.2 | 1.2 | — | — | Aumento durationSeconds:15, hpCostPerSecond:0 |
| `saiyajin_instantTransmission` | Teletransportación | saiyajin | Control | pendiente | — | 40 | 12 | 0 | 1 | 1 | 1 | 40 × 1→1.5 = 40→60 px | 40 × 1→1.5 = 40→60 px | Teletransporte range:400 |
| `namekuseijin_lightGrenade` | Granada de Luz | namekuseijin | Ki · área | pendiente | — | 45 | 12 | 2.6→6 | 1 | 1 | 1 | 70 × 1→2.5 = 70→175 px | 70 × 1→2.5 = 70→175 px | area |
| `namekuseijin_makosen` | Onda Demoníaca (Makōsen) | namekuseijin | Ki · rayo | pendiente | — | 14 | 5 | 1.8→4.2 | 1 | 1 | 1 | 24 × 1→2.5 = 24→60 px | — | front |
| `namekuseijin_eyeLaser` | Rayo de los Ojos | namekuseijin | Ki · rayo | pendiente | — | 4 | 3 | 1.1→2.4 | 1 | 1 | 1 | 6 × 1→2 = 6→12 px | — | front |
| `terricola_dodonRay` | Rayo Dodon | terricola | Ki · rayo | pendiente | — | 16 | 4 | 2→4.5 | 1 | 1 | 1 | 8 × 1→2 = 8→16 px | — | front |
| `terricola_sokidan` | Sōkidan | terricola | Ki · rayo | pendiente | — | 20 | 7 | 2→4.8 | 1 | 1 | 1 | 24 × 1→2.5 = 24→60 px | — | Guiado turnRate:3 |
| `terricola_multiForm` | Multiforma | terricola | Control | pendiente | — | 55 | 30 | 0 | 1 | 1 | 1 | 40 × 1→1.5 = 40→60 px | 40 × 1→1.5 = 40→60 px | Copias copies:3, damageShare:0.33, durationSeconds:8 |
| `saiyajin_zanzoken` | Zanzōken (imagen residual) | saiyajin | Control | pendiente | — | 8 | 10 | 0 | 1 | 1 | 1 | 40 × 1→1.5 = 40→60 px | 40 × 1→1.5 = 40→60 px | Esquiva dodgeChance:0.5, durationSeconds:1.5 |
| `namekuseijin_zanzoken` | Zanzōken (imagen residual) | namekuseijin | Control | pendiente | — | 8 | 10 | 0 | 1 | 1 | 1 | 40 × 1→1.5 = 40→60 px | 40 × 1→1.5 = 40→60 px | Esquiva dodgeChance:0.5, durationSeconds:1.5 |
| `terricola_zanzoken` | Zanzōken (imagen residual) | terricola | Control | pendiente | — | 8 | 10 | 0 | 1 | 1 | 1 | 40 × 1→1.5 = 40→60 px | 40 × 1→1.5 = 40→60 px | Esquiva dodgeChance:0.5, durationSeconds:1.5 |
| `freezer_zanzoken` | Zanzōken (imagen residual) | freezer | Control | pendiente | — | 8 | 10 | 0 | 1 | 1 | 1 | 40 × 1→1.5 = 40→60 px | 40 × 1→1.5 = 40→60 px | Esquiva dodgeChance:0.5, durationSeconds:1.5 |
| `freezer_novaStrike` | Nova Strike | freezer | Físico y combos | pendiente | — | 40 | 9 | 1 | 2.4→5.8 | 1 | 1.2 | 50 × 1→2 = 50→100 px | 50 × 1→2 = 50→100 px | contact |

### `environments/{APP_ENV}/kiArenaPlayerPowers/{playerId}:{powerId}` — poderes de cada personaje (tabla intermedia)

Relación muchos a muchos: un personaje tiene muchos poderes y un poder lo tienen muchos personajes.

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id` | string | Opcional | `{playerId}:{powerId}` |
| `reference` | referencia | Opcional | Referencia completa a sí mismo |
| `isActive` | boolean | Opcional | `false` = poder quitado al personaje (borrado suave) |
| `playerRef` | referencia | Sí | → `kiArenaPlayers` |
| `powerRef` | referencia | Sí | → `kiArenaPowers` |
| `unlockedAt` | string ISO | Sí | Cuándo lo obtuvo |
| `unlockedAtLevel` | number | Opcional | Nivel en que lo obtuvo |
| `source` | string | Opcional | `level` (por nivel), `admin` (dado por operador), `event` |
| `timesUsed` | number | Opcional | Veces que lo lanzó |
| `kills` | number | Opcional | Derrotas hechas con este poder |
| `lastUsedAt` | string ISO | Opcional | Último uso |
| `createdAt` / `updatedAt` | string ISO | Opcional | Fechas |

Regla: CUANDO un personaje alcanza `unlockLevel` de un poder activo de su raza, el sistema crea su fila aquí (`source: 'level'`). Un operador puede dar un poder de otra raza (`source: 'admin'`). Para saber qué puede lanzar un personaje se leen sus filas activas.

| Desde | Campo | Hacia | Cardinalidad |
|---|---|---|---|
| `kiArenaPlayerPowers` | `playerRef` | `kiArenaPlayers` | N filas → 1 personaje |
| `kiArenaPlayerPowers` | `powerRef` | `kiArenaPowers` | N filas → 1 poder |
| `kiArenaPowers` | `raceRef` | `kiArenaRaces` | N poderes → 1 raza |

## Colisión de rayo

Para cada objetivo: `along = (target − origen) · dir`, `side = |(target − origen) × dir|`. Impacta si `0 ≤ along ≤ dist + 18` y `side < radio`. `b.hit` (un `Set`) evita repetir daño.

| Poder | Radio lateral |
|---|---|
| `V` | `anchoV × 0.5 + 12` |
| `M` | `ancho × 0.5 + min(5, dist × 0.009) + 12` |
| `K` | `ancho × 0.675 + 12 + 12` (el trazo exterior dibuja `ancho × 1.35`) |

## Cómo añadir un poder (checklist obligatoria)

1. Letra y nivel en `POWER_UNLOCK_LEVELS` y nombre en `powerBlockReason`.
2. Curva por defecto en `DEFAULT_GAME_SETTINGS.powers` y en `normalizeGameSettings`.
3. Estado, cooldown, `launch*`, `fire*`, dibujo y radio en `game/arena.js`; conectar a `executePower` y a `refreshMessages`.
4. Regex de comandos en `arena-cloud.js` (`/^[EKMV]$/`) y en `bot-app.js` (`/^[KMV]$/`) + botón de atajo en `bot/index.html`.
5. Controles en `settings-app.js`; quitarlo de «pendientes» si estaba allí.
6. `PROJECT_SPEC.md`, esta spec y `CHANGELOG.md`.
