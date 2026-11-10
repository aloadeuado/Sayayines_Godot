# Tareas — Integración con TikTok Live (rama `feature/tiktok-live`, issue #7)

## Fase 0 — Aprobación
- [x] 0.1 Escribir HU, diseño y tareas (2026-11-10)
- [x] 0.2 Respuestas de Pedro a P1–P4 (2026-11-10)
- [x] 0.2b Visto bueno final de Pedro a la HU (2026-11-10)
- [x] 0.3 Cambios de modelo aprobados: ajustes y mensajes; jugadores solo con `username` (2026-11-10)

## Fase 1 — Conexión, entrada, likes y regalos con poderes que ya existen
- [x] 1.1 `desktop/tiktok/receiver.js`: conexión por @usuario, reintentos, normalización, deduplicación — _HU-TT-01, HU-TT-09_
- [x] 1.2 `server.js`: `GET /api/tiktok/events` (SSE) y `/api/tiktok/status`, solo `127.0.0.1` — _HU-TT-01_
- [x] 1.3 `main.js`: menú «TikTok Live», panel `/tiktok` y `preferencias.json` (probado en Windows; macOS sin probar) — _HU-TT-01_
- [x] 1.4 `services/tiktok/map-event.js` puro + aserciones Node — _HU-TT-02 a 05_
- [x] 1.5 Arena: entrada con ID `tiktok_{userId}` y nombre limpio — _HU-TT-02_
- [x] 1.6 Arena: curación por like con «+N» — _HU-TT-03_
- [x] 1.7 Arena: cola de poderes pagados (respeta nivel/raza, sin enfriamiento, máx. 5) con Kamehameha y Makankosappo — _HU-TT-04_
- [x] 1.7b Motor `kiBlast`: Ráfaga de Ki con pose a una mano (Rosa y letra `B`) y reemplazo de regalos bloqueados — _HU-TT-10_
- [x] 1.8 Sin HP sale del tablero; espera de 10 s para volver con «e», todas las plataformas — _HU-TT-07_
- [x] 1.9 Simulador en el panel `/tiktok` (comentario, likes, regalo) — _HU-TT-08_
- [x] 1.10 `/settings`: editar mapa de regalos, HP por like, cola y espera — _HU-TT-05_

## Fase 2 — Poderes nuevos para los regalos
- [x] 2.1 Motor `melee` (embestida + combos) con Embestida y Combo Meteoro — _HU-TT-06_
- [x] 2.2 Puño del Lobo (6 golpes) y Puño del Dragón con el motor `melee` — _HU-TT-06_
- [x] 2.3 Rayo genérico: Galick Ho y Resplandor Final — _HU-TT-05_
- [x] 2.4 Motor `spiritBomb`: Genkidama con carga por chat — _HU-TT-05_
- [ ] 2.5 Overlay de hitboxes y video corto (MP4) para revisión de Pedro (hay capturas del emulador)

## Cierre
- [ ] 3.1 Probar en un live real de Pedro (él lo abre; yo no me conecto a sus cuentas)
- [x] 3.2 `PROJECT_SPEC.md`, `FIRESTORE.md` (si cambia el modelo), `CHANGELOG.md`, crear `docs/TIKTOK_INTEGRATION.md`
- [ ] 3.3 `node --check`, `git diff --check`, `npm run check` del escritorio; PR hacia `dev`
