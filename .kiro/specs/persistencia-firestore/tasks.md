# Tareas — Persistencia Firestore

## 1. Implementado (verificado en código, 2026-10-22)

- [x] 1.1 Entornos por URL con fallback `dev` (hoy `dev|qa|prod`; ver 3.x) — _HU-FS-01_
- [x] 1.2 Perfiles normalizados con `schemaVersion 2` — _HU-FS-02_
- [x] 1.3 Mensajes, eventos y paginación de jugadores — _HU-FS-03_
- [x] 1.4 Sin almacenamiento local — _HU-FS-04_
- [x] 1.5 Timeout 10 s y estado visible — _HU-FS-05_

## 2. Pendiente

- [ ] 2.1 Proyectos Firebase separados por entorno antes de producción real — _HU-FS-01.3_
- [ ] 2.2 Usar `updateMask` / precondiciones en `save` para no pisar campos ni crear dobles — _Riesgos_
- [ ] 2.3 Usar `REQUEST_TIME` del servidor para `createdAt`/`updatedAt` — _Riesgos_
- [ ] 2.4 Reglas Firestore y autenticación (ver `seguridad-y-autoridad`)

## 3. Correcciones por reglas obligatorias (2026-10-22) · requieren aprobación de Pedro para tocar código

- [ ] 3.1 Crear `config/environment.js` con `APP_ENV` = `dev|qa|prd`, validación y rutas; error visible si falta — _HU-FS-01_
- [ ] 3.2 `config/firebase.js` y `arena-cloud.js` usan solo ese módulo; quitar `prod` — _HU-FS-01.3_
- [ ] 3.3 Selectores de entorno en `index.html`, `bot/index.html`, `settings/index.html` y `wireEnvironment`: opción `prd` en lugar de `prod` (o quitar el selector si `APP_ENV` lo fija el despliegue) — _HU-FS-01_
- [ ] 3.4 Inyección de `APP_ENV` por despliegue (destinos de Hosting dev/qa/prd o `env.js` generado) — _HU-FS-01_
- [ ] 3.5 Migración de datos `environments/prod/…` → `environments/prd/…` por copia, sin borrar origen; plan y respaldo aprobados — _HU-FS-01_
- [ ] 3.6 `save`, `addRecord`, `saveSettings` escriben `id`, `reference` (referencia completa) e `isActive` — _HU-FS-07_
- [ ] 3.6b `toFields`/`fromFields` soportan `referenceValue`; helper `docRef(colección, id)` en el módulo de entorno; relaciones `playerRef`, `victimRef`, `killerRef` — _HU-FS-07.1b, 07.1c_
- [ ] 3.7 Lecturas toleran campos ausentes y filtran `isActive === false` — _HU-FS-07.2, 08.3, 08.4_
- [ ] 3.8 `softDelete(kind, id)` en el adaptador; prohibido `DELETE` — _HU-FS-08.1, 08.2_
- [ ] 3.9 (Opcional, solo si Pedro lo pide) backfill de `id`/`reference`/`isActive=true` en documentos existentes — _HU-FS-07.3_
- [ ] 3.10 Actualizar `KiArena/docs/FIRESTORE.md`, `FIREBASE.md`, `PROJECT_SPEC.md` y `README.md` con `dev|qa|prd` y los campos base
- [ ] 3.11 Catálogo `kiArenaPlayerTypes` (sembrar goku/piccolo/gohan/freezer en dev y qa) y `playerTypeRef` en `kiArenaPlayers`; leer `race` legado; `CHARACTER_OPTIONS`/`settings.characters` pasan a leer el catálogo — _propuesta 2026-10-24, pendiente de aprobación_
- [ ] 3.12 Catálogo `kiArenaRaces` con `stats` (ki, physicalAttack, physicalDefense, kiDefense) y `utility` editables en settings; aplicar multiplicadores en `calculateLevelStats` y las utilidades Zenkai, Regeneración, Ingenio y Transformación — _propuesta 2026-10-24, pendiente de aprobación_
