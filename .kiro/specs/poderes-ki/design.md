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

## Propuesta: catálogo `kiArenaPowers` (Pedro, 2026-10-24) · PENDIENTE

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
| `width.start` / `.end` | number | Opcional | Anchura del rayo en nivel 1 y 100 |
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
