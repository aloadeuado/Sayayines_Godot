# Diseño — Integración con TikTok Live · FASE 1 IMPLEMENTADA (2026-11-10)

> **Rutas Firestore (obligatorio):** todo modelo de este módulo vive en `environments/{APP_ENV}/{colección}/{id}`: colección raíz `environments`, un documento por entorno (`dev`, `qa`, `prd`) y dentro todas las colecciones. Cualquier ruta abreviada en este archivo (`kiArenaX/{id}`) cuelga de ese prefijo. Ver `.kiro/steering/reglas-datos.md`.

## Arquitectura (todo en la máquina del streamer)

```text
TikTok Live (@usuario)
   │  WebSocket (librería tiktok-live-connector, sin login)
   ▼
desktop/tiktok/receiver.js   ← proceso principal de Electron
   │  normaliza: { type: 'chat'|'like'|'gift', eventId, userId, uniqueId, nickname, text?, likeCount?, gift? }
   │  deduplica por eventId, limita frecuencia, ignora rachas sin repeatEnd
   ▼
desktop/server.js  GET /api/tiktok/events  (Server-Sent Events, solo 127.0.0.1)
   ▼
public/src/services/tiktok/live-client.js   ← arena (EventSource; solo si corre en el escritorio)
   │  mapTikTokEvent(evento, settings) → acción de juego
   ▼
arena.js:  join(tiktok_{userId}) · heal(N) · castPaidPower(code)  →  guardado normal en Firestore
```

| Pieza | Archivo | Qué hace |
|---|---|---|
| Receptor | `KiArena/desktop/tiktok/receiver.js` (nuevo) | Conecta al live por @usuario, reintenta, normaliza y deduplica eventos |
| Canal local | `KiArena/desktop/server.js` | Nueva ruta `GET /api/tiktok/events` (SSE) y `GET /api/tiktok/status`; solo escucha en `127.0.0.1` |
| Menú | `KiArena/desktop/main.js` | Menú «TikTok Live»: «Conectar / estado…» (abre `/tiktok`) y «Desconectar»; guarda el @usuario en `preferencias.json` y reconecta al abrir |
| Panel | `KiArena/public/tiktok/index.html`, `KiArena/public/src/app/tiktok-app.js` | Conectar por @usuario, estado, lista de regalos del live con ID y monedas, simulador |
| Mapeo puro | `KiArena/public/src/services/tiktok/map-event.js` (nuevo) | `mapTikTokEvent(evento, ajustes)` sin DOM ni red; probado con aserciones Node |
| Cliente | `KiArena/public/src/services/tiktok/live-client.js` (nuevo) | `EventSource` hacia el servidor local; en la web pública (Hosting) no hace nada |
| Juego | `KiArena/public/src/game/arena.js` | Entrada con ID explícito, `heal`, cola de poderes pagados, espera de reingreso, motores nuevos |
| Simulador | `KiArena/public/src/app/tiktok-app.js` → `POST /api/tiktok/simulate` | Inyecta eventos al mismo canal (marcados «simulado», `platform: tiktok-sim`) |

**Librería:** `tiktok-live-connector` (Node, MIT, no oficial). No pide la contraseña: se conecta al live público por @usuario. Riesgos: TikTok puede cambiar su protocolo y romperla; para firmar la conexión usa un servicio externo de firma (Euler Stream) que con mucho uso puede pedir una API key gratuita. Si Pedro consigue una key, va en `KiArena/config/environments/{env}.local.env` como `TIKTOK_SIGN_API_KEY` (ignorado por Git), nunca en `public/`.

**Por qué SSE y no Firestore para los eventos:** un live con muchos likes generaría cientos de escrituras por minuto. Los likes y regalos llegan directo a la arena por el servidor local; a Firestore solo van la entrada, los regalos (como mensajes, para deduplicar e historial) y el guardado normal del guerrero.

## Eventos de TikTok → acciones

| Evento TikTok | Condición | Acción | Se guarda en Firestore |
|---|---|---|---|
| `chat` | texto = `e`/`E` | Entrar con `tiktok_{userId}` (respeta espera de 10 s) | Mensaje `tiktok_{msgId}` (`E`) y perfil del jugador |
| `chat` | texto = `K`/`M`/`V`/`B` | Poder normal (nivel, raza, enfriamiento) | Mensaje `tiktok_{msgId}` |
| `chat` | otro texto | Solo se muestra en el chat de la arena | No |
| `like` | guerrero vivo | `hp = min(maxHp, hp + likeCount × likeHealHp)` y «+N» verde | Solo con el guardado normal del guerrero |
| `gift` | `repeatEnd` o regalo sin racha, regalo mapeado | Entrar si hace falta y encolar `repeatCount` poderes pagados (máx. 5), sin enfriamiento. Si el poder está bloqueado por nivel o raza, sale la Ráfaga de Ki | Mensaje `tiktok_{msgId}` |
| `gift` | regalo no mapeado | Agradecimiento en el chat | Mensaje `tiktok_{msgId}` |

## Mapa de regalos propuesto

Las monedas son aproximadas y los nombres pueden variar por región: al implementar se toma la lista real del live (`getAvailableGifts`, que trae id, nombre y monedas) y se guardan `giftId` y nombre. Las filas «por elegir» las escoge Pedro de esa lista. Mismo número de poderes de ki y cuerpo a cuerpo en cada escalón (HU-TT-06). Todos los poderes respetan su nivel de desbloqueo y su raza, salvo la Ráfaga de Ki (Pedro, 2026-11-10); el nivel sale de `kiArenaPowers.unlockLevel`.

| Escalón | Regalo | Monedas | Poder (doblaje latino) | Tipo | Raza dueña | Mecánica hoy |
|---|---|---|---|---|---|---|
| Simple | Rosa | 1 | Ráfaga de Ki (una mano, sin nivel) | Ki (esfera) | Todas | ❌ falta motor `kiBlast` |
| Simple | Cono de helado | 1 | Kamehameha (nivel 20) | Ki (rayo) | Todas | ✅ existe |
| Simple | Corazón con dedos | 5 | Makankosappo (nivel 10) | Ki (rayo) | Todas | ✅ existe |
| Simple | TikTok | 1 | Embestida | Cuerpo a cuerpo | Todas | ❌ falta motor `melee` |
| Simple | GG | 1 | Combo Meteoro (4 golpes) | Combo cuerpo a cuerpo | Saiyajin | ❌ falta motor `melee` |
| Bueno | Por elegir (≈10) | ≈10 | Galick Ho | Ki (rayo) | Saiyajin | ❌ reutiliza motor de rayo |
| Bueno | Por elegir (≈10) | ≈10 | Puño del Lobo (combo largo, 6 golpes) | Combo cuerpo a cuerpo | Terrícola | ❌ falta motor `melee` |
| Bueno | Perfume | 20 | Resplandor Final | Ki (rayo grande) | Saiyajin | ❌ reutiliza motor de rayo |
| Bueno | Por elegir (≈15–20) | ≈15–20 | Puño del Dragón | Cuerpo a cuerpo fuerte | Saiyajin | ❌ falta motor `melee` |
| Máximo | León | ≈29 999 | Genkidama | Ki (área) | Saiyajin | ❌ falta motor `spiritBomb` |

## Motores de combate nuevos (implementados en la fase 2; daño por golpe: Embestida 0.4, Combo Meteoro 0.25, Puño del Lobo 0.2, Puño del Dragón 1.1 × ataque físico × multiplicador)

| Motor | Poderes que cubre | Comportamiento |
|---|---|---|
| `kiBlast` | Ráfaga de Ki (Rosa, letra `B`) | Pose nueva a una mano (≈0.2 s), esfera pequeña de ki recta hacia donde mira; daña al primer rival que toca. Es el reemplazo de un regalo bloqueado. |
| `melee` | Embestida, Combo Meteoro, Puño del Lobo, Puño del Dragón (y luego Jan Ken, Brazo Elástico, Latigazo de Cola, Nova Strike) | Se lanza hacia el rival más cercano del lado al que mira (alcance ≈ 220 px), golpea `hits` veces cada 0.12 s con daño físico `AtaqueFísico(N) × multiplicador`, defensa física del rival, poses de `fighter-melee-poses-v1.png`, retroceso pequeño en el último golpe. `hits` sale del código por poder (1, 4, 6, 1). |
| Rayo genérico | Galick Ho, Resplandor Final (y luego Masenko, Makosen…) | Mismo motor que Kamehameha con color, grosor y daño del catálogo (`baseSizeY`, `multipliers`). |
| `spiritBomb` | Genkidama | Carga 4 s con la esfera creciendo sobre la cabeza (el chat que escribe durante la carga suma poder, utilidad `chatCharge` ya en el catálogo), luego cae sobre el rival más cercano y explota en área. |

Según HU-POD-09.5, `engine` y `status` salen del código, así que activar estos motores **no cambia** el modelo `kiArenaPowers`.

## Cambios de modelo (aprobados por Pedro el 2026-11-10: 1 y 3; el 2 solo con `username`)

### 1. Ajustes de TikTok — `environments/{APP_ENV}/kiArenaSettings/gameplay` → `settingsJson`

| Campo | Tipo | Obligatorio | Descripción | ¿Hoy se guarda? |
|---|---|---|---|---|
| `settingsJson.tiktok.likeHealHp` | number | No (por defecto 1) | HP que cura cada like | No, nuevo |
| `settingsJson.tiktok.maxQueuedPerUser` | number | No (por defecto 5) | Poderes pagados en cola por espectador | No, nuevo |
| `settingsJson.tiktok.gifts[]` | array | No | Una fila por regalo mapeado | No, nuevo |
| `settingsJson.tiktok.gifts[].giftId` | number | Sí | ID del regalo en TikTok | No, nuevo |
| `settingsJson.tiktok.gifts[].giftName` | string | Sí | Nombre para mostrar (Rosa, León…) | No, nuevo |
| `settingsJson.tiktok.gifts[].coins` | number | No | Monedas del regalo (solo informativo) | No, nuevo |
| `settingsJson.tiktok.gifts[].powerCode` | string | Sí | `code` del poder en `kiArenaPowers` (`kamehameha`, `spiritBomb`…) | No, nuevo |
| `settingsJson.tiktok.gifts[].isActive` | boolean | No | `false` desactiva el regalo sin borrarlo | No, nuevo |
| `settingsJson.rejoinCooldownSeconds` | number | No (por defecto 10) | Segundos de espera para volver a entrar (todas las plataformas) | No, nuevo |

Valores iniciales: la tabla «Mapa de regalos propuesto», `likeHealHp = 1`, `maxQueuedPerUser = 5`, `rejoinCooldownSeconds = 10`. Se editan desde `/settings`.

**Alternativa sin tocar Firestore:** guardar el mapa en un archivo local del escritorio (`tiktok-regalos.json` en la carpeta de datos de la app). Contra: no se edita desde `/settings` y no viaja entre entornos ni máquinas.

### 2. Jugadores de TikTok — `environments/{APP_ENV}/kiArenaPlayers/tiktok_{userId}`

El ID `tiktok_{userId}` ya está previsto en `reglas-datos.md`. Campos opcionales propuestos:

| Campo | Tipo | Obligatorio | Descripción | ¿Hoy se guarda? |
|---|---|---|---|---|
| `id`, `reference`, `isActive` | string, referencia, boolean | No | Campos base | Sí |
| `username` | string | Sí | @usuario de TikTok limpio; se actualiza si la persona cambia de @ | Sí (mismo campo) |
| `platform` | string | No | `'tiktok'` | No, nuevo |
| `externalId` | string | No | `userId` numérico de TikTok | No, nuevo |
| `avatarUrl` | string | No | Foto de perfil, para dibujarla sobre el guerrero (opcional, más adelante) | No, nuevo |

**Alternativa sin campos nuevos:** el prefijo del ID ya dice la plataforma y el ID externo; solo se guarda `username`.

### 3. Mensajes de TikTok — `environments/{APP_ENV}/kiArenaMessages/tiktok_{msgId}`

| Campo | Tipo | Obligatorio | Descripción | ¿Hoy se guarda? |
|---|---|---|---|---|
| `id`, `reference`, `isActive` | string, referencia, boolean | No | Campos base | Sí |
| `username`, `text`, `command`, `playerRef` | — | — | Igual que hoy | Sí |
| `platform` | string | No | `'tiktok'` (o `'tiktok-sim'` en la simulación) | No, nuevo |
| `gift.giftId` | number | No | Regalo recibido | No, nuevo |
| `gift.giftName` | string | No | Nombre del regalo | No, nuevo |
| `gift.count` | number | No | Unidades de la racha | No, nuevo |
| `gift.powerCode` | string | No | Poder que lanzó | No, nuevo |

**Alternativa sin campos nuevos:** solo `text` = «🎁 Rosa ×3 → Kamehameha». Contra: no hay estadísticas de regalos.

### Relaciones

| Desde | Campo | Hacia | Cardinalidad |
|---|---|---|---|
| `kiArenaMessages/tiktok_{msgId}` | `playerRef` | `kiArenaPlayers/tiktok_{userId}` | N a 1 |
| `settingsJson.tiktok.gifts[]` | `powerCode` | `kiArenaPowers` (por `code`, la raza se resuelve al lanzar) | N a 1 |

### Lo que NO cambia

| Modelo | Motivo |
|---|---|
| `kiArenaPowers` | El regalo se mapea en Settings, no en el poder; `engine`/`status` vienen del código |
| `kiArenaPlayerPowers` | Los poderes pagados no se desbloquean para siempre; solo se suma `timesUsed`/`kills` si el guerrero ya tiene la fila |
| Espera de reingreso | Se lleva en memoria de la arena (si se recarga la arena, se reinicia); no hay campo `lastLeftAt` |
| Desbloqueo por nivel | Se usa el `unlockLevel` que ya existe en `kiArenaPowers` |
