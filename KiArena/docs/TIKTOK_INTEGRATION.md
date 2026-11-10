# Integración con TikTok Live

Estado (2026-11-10): **fases 1 y 2 implementadas** en la app de escritorio y probada con eventos simulados contra el emulador de Firestore. Falta probarla en un live real. Spec: `.kiro/specs/integracion-tiktok/`.

## Cómo se usa

1. Abre la app de escritorio de Ki Arena y la ventana de la arena (Ctrl/⌘1). Los eventos solo llegan si la arena está abierta.
2. Menú **TikTok Live → Conectar / estado…** (Ctrl/⌘6), escribe tu @usuario y pulsa **Conectar**. Tienes que estar en vivo; si no, la app reintenta sola cada 5 a 60 s.
3. El panel muestra el estado y la lista de regalos de tu live con su **ID**. Copia los IDs a **Settings → TikTok Live** para fijar cada regalo (con ID 0 se reconoce por su nombre en inglés).
4. Para ensayar sin estar en vivo usa el **simulador** del mismo panel (comentario, likes y regalos). Lo simulado sale marcado así y no conecta TikTok.

## Arquitectura

```text
TikTok Live ──(tiktok-live-connector, sin login)──▶ desktop/tiktok/receiver.js
   normaliza chat / like / gift, deduplica, solo el final de cada racha
        ▼
desktop/server.js  GET /api/tiktok/events (SSE) · POST connect / disconnect / simulate
        ▼
public/src/services/tiktok/live-client.js ──▶ map-event.js (puro) ──▶ game/arena.js
        ▼
Firestore: perfil del jugador (guardado normal) y mensajes tiktok_{eventId}
```

| Pieza | Archivo |
|---|---|
| Receptor | `KiArena/desktop/tiktok/receiver.js` |
| Canal local | `KiArena/desktop/server.js` (`/api/tiktok/**`, solo `127.0.0.1` y mismo origen para los POST) |
| Menú y reconexión | `KiArena/desktop/main.js` (`preferencias.json` → `tiktokUsername`) |
| Mapeo | `KiArena/public/src/services/tiktok/map-event.js` |
| Cliente | `KiArena/public/src/services/tiktok/live-client.js` |
| Panel | `KiArena/public/tiktok/index.html`, `KiArena/public/src/app/tiktok-app.js` |
| Juego | `KiArena/public/src/game/arena.js` (`handleTikTok`, `healPlayer`, `queueGiftPowers`, `launchBlast`) |
| Pruebas | `node KiArena/scripts/test-tiktok-map.mjs` |

## Reglas

| Evento | Resultado |
|---|---|
| `e`/`E` en el chat | Entra el guerrero `tiktok_{userId}` con el @ limpio (`[A-Za-z0-9_.-]{3,24}`) |
| `K`, `M`, `V`, `B` en el chat | Poder con nivel, raza y enfriamiento |
| Otro texto | Solo se muestra |
| Like | +`likeHealHp` HP por like hasta el máximo; «+N» verde; no revive |
| Regalo con mapa | Poder por `powerCode`, respetando nivel y raza, sin enfriamiento; cola de `maxQueuedPerUser`; tope de 20 poderes/s en la arena |
| Regalo con poder bloqueado o sin mecánica | Ráfaga de Ki y aviso con el motivo |
| Regalo sin mapa | Agradecimiento |
| 0 HP | Sale del tablero; vuelve con `E` tras `rejoinCooldownSeconds` (10 s). Regalos en la espera se lanzan al volver |

## Mapa de regalos inicial

| Regalo (TikTok) | ID | Monedas | Poder | Mecánica |
|---|---|---|---|---|
| Rose (Rosa) | 5655 | 1 | Ráfaga de Ki | ✅ |
| Ice Cream Cone (Cono de helado) | por fijar | 1 | Kamehameha (nivel 20) | ✅ |
| TikTok | por fijar | 1 | Embestida (2 golpes) | ✅ |
| GG | por fijar | 1 | Combo Meteoro (4 golpes, Saiyajin nivel 15) | ✅ |
| Finger Heart (Corazón con dedos) | por fijar | 5 | Makankosappo (nivel 10) | ✅ |
| Perfume | por fijar | 20 | Resplandor Final (Saiyajin nivel 60) | ✅ |
| Lion (León) | por fijar | ≈29 999 | Genkidama (Saiyajin nivel 80; el chat le suma poder) | ✅ |

Galick Ho (Saiyajin 25), Puño del Lobo (Terrícola 12, 6 golpes) y Puño del Dragón (Saiyajin 35) ya funcionan; esperan que Pedro elija sus regalos de ≈10–20 monedas en Settings.

## Seguridad y límites

- No se pide ni guarda la contraseña ni tokens de TikTok. La API key de firma de Euler Stream (opcional) va en `TIKTOK_SIGN_API_KEY` o en `KiArena/config/environments/{env}.local.env`, ignorado por Git; nunca en `public/` ni en Firestore.
- La librería es no oficial y puede romperse si TikTok cambia su protocolo.
- Los likes no se escriben uno por uno en Firestore: la vida curada se guarda cada 5 s con el perfil.
- Una web de internet no puede conectar ni simular: los POST exigen el mismo origen que el servidor local.
