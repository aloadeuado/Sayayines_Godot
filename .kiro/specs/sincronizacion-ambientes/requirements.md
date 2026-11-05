# Requisitos — Sincronizar ambientes (dev → qa → prd)

> **Rutas Firestore (obligatorio):** todo vive en `environments/{APP_ENV}/{colección}/{id}`. Sincronizar = copiar documentos de `environments/{origen}/X` a `environments/{destino}/X`.

Pedro (2026-11-05): algunas tablas (empezando por los roles) se crean en dev y se pasan a qa y luego a producción desde un «settings de administrador», no a mano.

### HU-SYN-01 — Sincronizar catálogos entre ambientes
**Historia de usuario:** Como superadministrador, quiero copiar ciertas tablas de un ambiente a otro, para promover a qa y prd lo que ya probé en dev.

**Criterios de aceptación**
1. Solo DEBEN sincronizarse las tablas de la lista permitida (`SYNC_COLLECTIONS`): hoy `kiArenaRoles`, `kiArenaRaces`, `kiArenaPlayerTypes`, `kiArenaPowers` y `kiArenaProviderTypes`. Nunca usuarios, jugadores, mensajes, eventos ni tablas intermedias.
2. ANTES de escribir, el sistema DEBE mostrar las diferencias por documento: crear, actualizar (con los campos que cambian), iguales y «solo en destino».
3. Las referencias DEBEN reescribirse al ambiente destino (`environments/dev/…` → `environments/qa/…`) y `reference` DEBE apuntar al propio destino.
4. El sistema NO DEBE borrar nada: lo que solo existe en destino se deja igual; el borrado suave viaja como `isActive=false`.
5. Solo se escriben los campos del origen; los campos propios de cada ambiente (`clientId`, `redirectUri`) NUNCA se copian y los que solo tiene el destino se conservan.
6. Escribir en `prd` DEBE pedir confirmación explícita (teclear «prd» en /settings o `--confirm-prd` en el script).
7. Cada documento escrito DEBE guardar `syncedFrom` y `syncedAt`.
8. La sección DEBE verse solo para `superadmin` cuando existan las reglas por rol (pendiente, HU-SEC-01).

### HU-SYN-02 — Mismo proceso por consola
**Historia de usuario:** Como desarrollador, quiero el mismo proceso por consola, para sincronizar sin abrir la web.

**Criterios de aceptación**
1. `npm run sync:envs -- <origen> <destino> [--only=roles,powers] [--apply] [--confirm-prd]` DEBE usar la misma lógica que /settings.
2. Sin `--apply` DEBE solo mostrar las diferencias.
