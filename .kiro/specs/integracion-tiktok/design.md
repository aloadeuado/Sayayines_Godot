# Diseño — TikTok · PENDIENTE

> **Rutas Firestore (obligatorio):** todo modelo de este módulo vive en `environments/{APP_ENV}/{colección}/{id}`: colección raíz `environments`, un documento por entorno (`dev`, `qa`, `prd`) y dentro todas las colecciones. Cualquier ruta abreviada en este archivo (`kiArenaX/{id}`) cuelga de ese prefijo. Ver `.kiro/steering/reglas-datos.md`.

```text
TikTok Live (receptor en backend, futuro) ─┐
Botón «Simular regalo» en /bot ────────────┤→ evento normalizado { platform, userId, username, giftId, count, eventId }
                                           ▼
             services/tiktok/ mapGiftToCommand(evento, mapa) → { username, text: 'K' } | null
                                           ▼
                           kiArenaMessages (contrato existente)
```

El mapa regalo→comando debería guardarse en Settings por entorno para que el streamer lo edite.
