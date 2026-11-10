# Tareas — Feedback visual en la arena

> P1–P4 sin respuesta de Pedro: se aplicó la recomendación de cada una (2026-11-10).

## 1. Mensajes rojos
- [x] 1.1 `warn(f, text)` y `drawWarnings(dt)` en `arena.js` (1.8 s, uno por luchador, sin repetir antes de 1.5 s; si dos se pisan, el siguiente sube una línea). _HU-FB-03_
- [x] 1.2 `shortBlockReasonFor` / `shortBlockReasonForCode` en `game-catalog.js` para M1, M2, M5, M6, M10. _HU-FB-03_
- [x] 1.3 `castBlock` para M3 (segundos), M4 (poder en curso) y M9 (sin rival); el genérico «no disponible ahora» queda solo como último recurso. _HU-FB-04_
- [x] 1.4 Conectar `executePower` y `postChat` a `warn` + chat. _HU-FB-03_
- [x] 1.5 M7 y M8 en `queueGiftPowers` / `queuePaidPower`; un golpe en cola sin rival espera en la cola. _HU-FB-05_

## 2. Iconos
- [x] 2.1 `iconPowersOf`, `cooldownLeft` y `drawPowerIcons` con sector de enfriamiento. _HU-FB-01_
- [x] 2.2 Insignia `×N` desde la cola de regalos y usados en esta vida (`f.usedThisLife`, se reinicia al volver). _HU-FB-01_
- [x] 2.3 Segmento de buffs que lee `f.buffs` (vacío, invisible). _HU-FB-02_

## 3. Verificación y cierre
- [x] 3.1 `node --check` de `KiArena/public/src/**/*.js`, `git diff --check` y `scripts/test-tiktok-map.mjs`.
- [x] 3.2 Capturas en Chrome con emulador de Firestore y eventos simulados de TikTok: M1, M2, M3, M4, M7, M8 y los iconos con cola, recarga y usados. M5, M6, M9, M10 y el modo 9:16 no se capturaron.
- [x] 3.3 `CHANGELOG.md` y fila en `.kiro/specs/README.md`.
