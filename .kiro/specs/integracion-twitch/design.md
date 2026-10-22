# Diseño — Twitch · PENDIENTE

```text
Twitch EventSub (WebSocket, channel.chat.message)
        │  OAuth de usuario (token en backend)
        ▼
Backend confiable (Cloud Function / servidor)  ── dedupe por message_id, rate limit
        │  { username, twitchUserId, text }
        ▼
Firestore kiArenaMessages  ──►  arena / (consumidor existente)
```

- Adaptador en `public/src/services/twitch/` solo si no requiere secretos (p. ej., lectura con token implícito del broadcaster); si requiere Client Secret o refresh, vive en backend.
- No escribe perfiles ni ejecuta combate: publica mensajes igual que `/bot`.
- Documentación oficial: autenticación de chat, EventSub WebSocket y tipos de suscripción (enlaces en `KiArena/docs/TWITCH_INTEGRATION.md`).
