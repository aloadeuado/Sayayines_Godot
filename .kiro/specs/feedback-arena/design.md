# Diseño — Feedback visual en la arena

## Componentes

| Pieza | Archivo | Qué hace |
|---|---|---|
| `drawPowerIcons(f, barY)` | `KiArena/public/src/game/arena.js` | Dibuja la fila de iconos y el segmento de buffs entre el nombre y la barra de vida (el nombre sube 16 px). |
| `iconPowersOf(f)` | `arena.js` | `availablePowers(...)` con `command` (orden V, B, M, K) + poderes en `f.paidQueue`, sin repetir. |
| `cooldownLeft(f, power)` | `arena.js` | Lee `kameCd`, `makaCd`, `deathCd`, `blastCd`, `meleeCd`, `spiritCd` según `power.engine` (mismo mapa que `castPower`). |
| `warn(f, text)` | `arena.js` | Crea o reemplaza el mensaje rojo del luchador (`f.warning = {text, born, life: 1.8}`); ignora el mismo texto antes de 1.5 s. |
| `drawWarnings(dt)` | `arena.js` | Pinta los mensajes rojos después de `drawFloaters`, encima de todo. |
| `castBlockReason(f, power)` | `arena.js` | Devuelve `{red, chat}` para enfriamiento (M3), ocupado (M4) y sin rival (M9). |
| `shortBlockReason(...)` | `KiArena/public/src/config/game-catalog.js` | Versión corta de `powerBlockReasonFor/ForCode` para M1, M2, M5, M6, M10. Las funciones largas no cambian. |

## Flujo

1. Letra → `executePower` → si `powerForCommand` es `null`: `warn(f, shortBlockReason)` + chat largo (como hoy).
2. Si hay poder pero `castPower` devuelve `false`: `castBlockReason` decide M3/M4/M9 → `warn` + chat.
3. `postChat` ya corta antes con `powerBlockReasonFor` cuando el jugador existe; si además está vivo en la arena, también llama a `warn`.
4. Regalo **(TikTok)** → `queueGiftPowers`: si el poder está bloqueado, `warn(f, corto + ' → Ráfaga de Ki')`; si la cola está llena, `queuePaidPower` devuelve cuántos descartó y se muestra M8.
5. Cada cuadro: `sprite()` llama a `drawPowerIcons`; `frame()` llama a `drawWarnings(dt)`.

## Contadores

- `×N` en cola: `f.paidQueue.filter(e => e.power.id === p.id).length`.
- Usados en esta vida: `f.usedThisLife[power.id]`, se suma en `trackPowerUse(..., 'timesUsed')` y se reinicia en `joinPlayer` al volver. Solo memoria; no se escribe en Firestore.

## Datos

No se agrega ni cambia ningún campo de Firestore. `f.buffs`, `f.warning` y `f.usedThisLife` viven solo en memoria del luchador.

## Decisiones

- Canvas puro, sin imágenes nuevas: icono = círculo del color del poder + letra. Funciona igual en navegador, Electron (Windows/macOS) y modo vertical.
- Un mensaje rojo por luchador para que 20 letras seguidas no tapen la arena.
- El chat lateral se mantiene: es el registro para el operador.
