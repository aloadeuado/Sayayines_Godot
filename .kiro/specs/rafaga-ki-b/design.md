# Diseño — Ráfaga de Ki (`B`) · PENDIENTE

Seguir la checklist «Cómo añadir un poder» de `.kiro/specs/poderes-ki/design.md`.

| Cambio | Archivo |
|---|---|
| `POWER_UNLOCK_LEVELS.B = 5`, nombre en `powerBlockReason` | `config/gameplay-settings.js` |
| `DEFAULT_GAME_SETTINGS.powers.generic.kiBlast` (o `kiBurst`) `{ start, end }` + normalización; retirar de `pending` si se reutiliza `kiBlast` | `config/gameplay-settings.js` |
| `kiBurstState`, `kiBurstCd`, `launchKiBurst`, `fireKiBurst`, dibujo, radio, rama en `executePower` y `refreshMessages` | `game/arena.js` |
| Regex `^[BEKMV]$` | `services/firebase/arena-cloud.js`, `app/bot-app.js`, `game/arena.js` |
| Botón `B` | `bot/index.html` |
| Curva y validación | `app/settings-app.js` |
| Documentación | `PROJECT_SPEC.md`, `CHANGELOG.md`, esta spec |

Decisión abierta: si `B` usa una pose de sprite propia o reutiliza la de Makankosappo con una mano; confirmar con Pedro o con su build local.
