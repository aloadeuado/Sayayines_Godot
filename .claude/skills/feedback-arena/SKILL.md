---
name: feedback-arena
description: Implementar o ajustar el feedback visual de la arena de Ki Arena (iconos de poderes bajo el nombre, hueco de buffs y mensajes rojos de acción bloqueada).
---

# Ki Arena · feedback-arena

> **Rutas Firestore (obligatorio):** todo modelo vive en `environments/{APP_ENV}/{colección}/{id}`. Esta área no crea ni cambia modelos; si una tarea lo pide, consulta a Pedro antes. Ver `.kiro/steering/reglas-datos.md`.

## Antes de empezar

1. Lee `.kiro/steering/` (product, tech, structure, reglas-datos).
2. Lee la spec `.kiro/specs/feedback-arena/` completa: `requirements.md` (tabla «Mensajes» con el texto exacto de cada caso), `design.md`, `tasks.md`.
3. Lee el inicio de `KiArena/docs/CHANGELOG.md`.
4. Revisa el código actual: si contradice la spec, el código manda y la spec se corrige en el mismo cambio.

## Archivos del área

- `KiArena/public/src/game/arena.js`: `sprite`, `executePower`, `castPower`, `queueGiftPowers`, `queuePaidPower`, `frame`.
- `KiArena/public/src/config/game-catalog.js`: `powerBlockReasonFor`, `powerBlockReasonForCode` (no cambiar su texto largo; el corto va aparte).

## Reglas del área

- Los textos rojos son exactamente los de la tabla «Mensajes»; si cambias uno, cambia la tabla.
- Un mensaje rojo por luchador; el chat lateral se mantiene con el texto largo.
- Solo canvas, sin imágenes nuevas; debe verse igual en horizontal y en 9:16, en Windows y macOS.
- Los casos **(TikTok)** dependen de la cola de regalos de `integracion-tiktok`.

## Verificación antes de entregar

```bash
for f in $(git ls-files 'KiArena/public/src/*.js'); do node --check "$f"; done
git diff --check
```

- No escribir, borrar ni migrar datos reales de Firestore; probar con emuladores.
- Añadir entrada fechada en `KiArena/docs/CHANGELOG.md`.
- No hacer commit, push ni deploy sin pedido explícito de Pedro. PR solo hacia `dev`.
