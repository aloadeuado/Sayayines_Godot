# Diseño — Panel de operador

## Componentes

| Archivo | Rol |
|---|---|
| `public/bot/index.html` | `#chat-log`, `#chat-user`, `#chat-message`, `#send-chat`, `#join-user`, botones `data-sim-command`, `#roster`, `#join-all`, `#global-metrics`, `#selected`, `#stats`, `#feed`, `#bot-status` |
| `public/src/app/bot-app.js` | `sendCommand`, `refreshChat`, `loadRoster`/`renderRoster`, `renderGlobalMetrics`, `renderSelectedPlayer`, `refreshCombatFeed`, `startBot` |

## Contrato con la arena

`/bot` es **productor**: solo escribe `kiArenaMessages { username, text, command, createdAt }`. La arena es **consumidora**: lee cada 2.5 s y ejecuta. Esta frontera es la misma que usarán Twitch y TikTok: cualquier fuente traduce su evento a `{ username, text }` y lo publica.

## Intervalos

`refreshChat` 2.5 s · `loadRoster` 4 s · `refreshCombatFeed` 4 s.

## Decisiones

- La validación de poderes se duplica a propósito (Bot y arena) para dar feedback inmediato y a la vez proteger la ejecución.
- `xpForNext` está duplicada en `bot-app.js`; ver tarea en `progresion-rpg`.
