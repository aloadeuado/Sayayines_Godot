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
