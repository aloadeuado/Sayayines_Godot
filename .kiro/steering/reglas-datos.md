---
inclusion: always
---

# Reglas de datos obligatorias (definidas por Pedro, 2026-10-22)

Estas dos reglas aplican a **todo** desarrollo de Ki Arena, nuevo o corregido. Una spec, tarea o PR que no las cumpla no está terminada.

## Regla 1 — Campos base y borrado suave

Todo modelo que se guarde en Firestore declara estos tres atributos. Son **opcionales en el modelo** (aclaración de Pedro, 2026-10-22) para que los registros que no los tienen no rompan nada, pero **toda escritura nueva DEBE llenarlos**:

| Campo | Tipo | Regla |
|---|---|---|
| `id` | string, opcional | Igual al ID del documento. Si falta, se usa el ID del documento. |
| `reference` | referencia Firestore (`referenceValue`), opcional | **Ruta completa** del propio documento, incluido el entorno: `projects/sayayin-c0dfe/databases/(default)/documents/environments/{APP_ENV}/{colección}/{id}`. Si falta, el registro es válido. No cambia. |
| `isActive` | boolean, opcional | `true` al crear. `false` = borrado suave. Si falta, cuenta como activo. |

Además se mantienen `createdAt` y `updatedAt` donde ya existen.

**Borrado suave:**
- Nada se borra físicamente: prohibido `DELETE` sobre documentos y prohibido borrar colecciones.
- «Borrar», «eliminar», «quitar» o «desactivar» = `PATCH isActive=false` + `updatedAt`.
- Toda lectura de listas o por ID DEBE ignorar registros con `isActive === false` (ausente = activo).
- `isActive` **no es** `alive`: `alive=false` es un luchador derrotado (estado de juego); `isActive=false` es un registro borrado.
- Reactivar un registro (`isActive=true`) es una acción explícita, nunca un efecto lateral.

**Referencia completa amarrada al entorno (aclaración de Pedro, 2026-10-22):**
- `reference` guarda la referencia Firestore **completa**, nunca un ID suelto ni un código corto. Como incluye `environments/{APP_ENV}`, una referencia de `qa` nunca apunta a datos de `dev` o `prd`: es intencional, porque cada entorno tiene datos totalmente distintos.
- Toda **relación** entre modelos también se guarda como referencia completa del mismo entorno (`…Ref`), no como texto con el ID. Se puede conservar un campo de texto solo para mostrar (p. ej. `username`, `victim`, `killer`).
- Una referencia de otro entorno es un error de datos: no se lee ni se escribe.
- En la API REST se escribe como `{ "referenceValue": "projects/…/documents/environments/qa/kiArenaPlayers/goku" }`.

| Modelo | Colección | `id` | `reference` | Relaciones (referencias completas) |
|---|---|---|---|---|
| Jugador | `kiArenaPlayers` | `usernameKey` (con Twitch/TikTok: `{plataforma}_{idExterno}`) | `…/environments/{APP_ENV}/kiArenaPlayers/{id}` | — |
| Mensaje | `kiArenaMessages` | auto-ID (o `{fuente}_{idOrigen}` para deduplicar) | `…/environments/{APP_ENV}/kiArenaMessages/{id}` | `playerRef` → jugador que lo envía (si existe) |
| Evento | `kiArenaEvents` | auto-ID | `…/environments/{APP_ENV}/kiArenaEvents/{id}` | `victimRef`, `killerRef` → jugadores |
| Ajustes | `kiArenaSettings` | `gameplay` | `…/environments/{APP_ENV}/kiArenaSettings/gameplay` | — |

**Compatibilidad (permanente):** los documentos antiguos no tienen estos campos y siguen siendo válidos. Al leer: `id` ausente → ID del documento; `reference` ausente → se permite; `isActive` ausente → activo. Al volver a escribir un documento antiguo se pueden completar los que falten, sin cambiar un `isActive` existente. No hace falta un backfill; si Pedro lo quiere, es opcional y requiere su aprobación.

## Regla 2 — Entorno por variable: `dev`, `qa`, `prd`

- El entorno sale de **una sola variable**, `APP_ENV`, con exactamente tres valores: `dev` (desarrollo), `qa` (QA) y `prd` (producción). No se usa `prod`.
- Toda ruta a Firestore se construye a partir de `APP_ENV` en un único módulo (`public/src/config/environment.js` propuesto): `environments/{APP_ENV}/kiArenaPlayers`, `…/kiArenaMessages`, `…/kiArenaEvents`, `…/kiArenaSettings/gameplay`.
- Ningún otro archivo escribe rutas, prefijos ni nombres de entorno a mano.
- Como es un sitio estático, `APP_ENV` se fija en el despliegue (un `env.js` generado por destino de Hosting o equivalente). Un valor ausente o inválido DEBE mostrar un error visible; solo en local se permite caer a `dev`.
- Si se mantiene el selector `?env=` en la URL, solo acepta `dev|qa|prd` (decisión pendiente con Pedro).
- Los datos que hoy viven en `environments/prod/…` necesitan migrarse a `environments/prd/…` (copia, sin borrar el origen; requiere aprobación de Pedro).
