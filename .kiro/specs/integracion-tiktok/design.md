# Diseño — TikTok · PENDIENTE

```text
TikTok Live (receptor en backend, futuro) ─┐
Botón «Simular regalo» en /bot ────────────┤→ evento normalizado { platform, userId, username, giftId, count, eventId }
                                           ▼
             services/tiktok/ mapGiftToCommand(evento, mapa) → { username, text: 'K' } | null
                                           ▼
                           kiArenaMessages (contrato existente)
```

El mapa regalo→comando debería guardarse en Settings por entorno para que el streamer lo edite.
