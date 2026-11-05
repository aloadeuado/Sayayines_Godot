---
name: sincronizacion-ambientes
description: Migrar o actualizar tablas de catálogo de Ki Arena de un ambiente a otro (dev → qa → prd), desde /settings o con npm run sync:envs, y agregar tablas nuevas a la lista sincronizable.
---

# Ki Arena · sincronizacion-ambientes

> **Rutas Firestore (obligatorio):** todo modelo vive en `environments/{APP_ENV}/{colección}/{id}`. Sincronizar = copiar de `environments/{origen}/X` a `environments/{destino}/X`. Ver `.kiro/steering/reglas-datos.md`.

## Reglas obligatorias (siempre)

Aplica la skill `reglas-desarrollo`: `id`, `reference`, `isActive` opcionales, borrado suave, referencias completas del mismo ambiente, `APP_ENV` = `dev` | `qa` | `prd`.

## Antes de empezar

1. Lee `.kiro/specs/sincronizacion-ambientes/` completa.
2. La lógica es una sola: `KiArena/public/src/services/firebase/env-sync.js`. La usan `/settings` y `functions/scripts/sync-environments.js`. No dupliques.

## Cómo sincronizar

1. Siempre primero las diferencias:
   ```bash
   cd KiArena/functions
   npm run sync:envs -- dev qa --only=roles
   ```
   O en `/settings` › Sincronizar ambientes › Ver diferencias.
2. Muestra a Pedro el plan en tabla (Documento | Acción | Campos) y pide su OK.
3. Con OK: `npm run sync:envs -- dev qa --only=roles --apply`.
4. `prd` solo con OK explícito de Pedro para ese paso: `--apply --confirm-prd` (en la web, teclear «prd»).
5. Vuelve a correr sin `--apply`: debe salir 0 por escribir.

## Reglas del área

- Solo tablas de `SYNC_COLLECTIONS` (catálogos). Nunca usuarios, jugadores, mensajes, eventos ni tablas intermedias (`kiArenaUserRoles`, `kiArenaPlayerPowers`…).
- Nada se borra. Lo que solo existe en destino se deja; el borrado suave viaja como `isActive=false`.
- Campos propios de cada ambiente van en `excludeFields` (hoy `clientId`, `redirectUri` de `kiArenaProviderTypes`).
- Para hacer sincronizable una tabla nueva: agrégala a `SYNC_COLLECTIONS`, a la tabla de `design.md` y una prueba en `functions/test/env-sync.test.js`.
- Escribir en `prd` nunca sin la confirmación de Pedro en el hilo.

## Verificación antes de entregar

```bash
cd KiArena/functions && npm run check && npm test
git diff --check
```

- Entrada fechada en `KiArena/docs/CHANGELOG.md` y tareas marcadas en `tasks.md`.
- No hacer commit, push ni deploy sin pedido explícito de Pedro.
