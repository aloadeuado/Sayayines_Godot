# Diseño — Sincronizar ambientes

> **Rutas Firestore (obligatorio):** `environments/{APP_ENV}/{colección}/{id}`; ver `.kiro/steering/reglas-datos.md`.

## Componentes

| Archivo | Rol |
|---|---|
| `public/src/services/firebase/env-sync.js` | Lógica única: lista permitida, plan de diferencias, reescritura de referencias, escritura con `updateMask` |
| `public/src/app/env-sync-panel.js` | Sección «Sincronizar ambientes» de `/settings` |
| `public/settings/index.html` | Formulario: origen, destino, tablas, confirmación prd, Ver diferencias / Sincronizar |
| `functions/scripts/sync-environments.js` | Lo mismo por consola (`npm run sync:envs`) |
| `functions/test/env-sync.test.js` | Pruebas del plan, referencias, prd y no borrado |

## Flujo

1. Leer `environments/{origen}/{colección}` y `environments/{destino}/{colección}` (REST, documentos crudos para no perder tipos).
2. Por documento del origen: quitar `excludeFields`, reescribir `referenceValue` al destino y comparar con el destino (ignorando `createdAt`, `updatedAt`, `syncedFrom`, `syncedAt`; 10 entero = 10.0).
3. Mostrar plan. El botón Sincronizar solo se activa después de ver las diferencias de esa misma selección.
4. Escribir solo `create` y `update` con PATCH + `updateMask` (campos del origen), `reference` del destino, `syncedFrom`, `syncedAt`, `updatedAt`.

## Tablas permitidas

| key | Colección | Campos que no se copian |
|---|---|---|
| roles | kiArenaRoles | — |
| races | kiArenaRaces | — |
| playerTypes | kiArenaPlayerTypes | — |
| powers | kiArenaPowers | — |
| providerTypes | kiArenaProviderTypes | `clientId`, `redirectUri` |

Para agregar una tabla: sumarla a `SYNC_COLLECTIONS` con sus `excludeFields` y anotarla aquí. Solo catálogos; nunca datos de personas.

## Riesgos

- Hoy escribe con la apiKey web pública porque las reglas de Firestore están abiertas. Cuando existan reglas por rol (HU-SEC-01), la sincronización debe pasar a una Cloud Function que valide `superadmin`.
- Las vistas viejas usan `environments/prod`; la sincronización usa `environments/prd` (regla de datos). La migración prod → prd sigue pendiente de aprobación.
