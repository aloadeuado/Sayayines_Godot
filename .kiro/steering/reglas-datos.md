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
| Raza | `kiArenaRaces` | `code` (`saiyajin`, `namekuseijin`, `terricola`, `freezer`) | `…/environments/{APP_ENV}/kiArenaRaces/{code}` | — |
| Poder de personaje | `kiArenaPlayerPowers` | `{playerId}:{powerId}` | `…/environments/{APP_ENV}/kiArenaPlayerPowers/{id}` | `playerRef` → personaje; `powerRef` → poder |
| Poder | `kiArenaPowers` | `{raceCode}_{powerCode}` | `…/environments/{APP_ENV}/kiArenaPowers/{id}` | `raceRef` → raza |
| Tipo de personaje | `kiArenaPlayerTypes` | `code` (`goku`, `piccolo`, `gohan`, `freezer`) | `…/environments/{APP_ENV}/kiArenaPlayerTypes/{code}` | `raceRef` → raza |
| Jugador | `kiArenaPlayers` | `usernameKey` (con Twitch/TikTok: `{plataforma}_{idExterno}`) | `…/environments/{APP_ENV}/kiArenaPlayers/{id}` | `playerTypeRef` → tipo de personaje; `userRef` → usuario (opcional) |
| Mensaje | `kiArenaMessages` | auto-ID (o `{fuente}_{idOrigen}` para deduplicar) | `…/environments/{APP_ENV}/kiArenaMessages/{id}` | `playerRef` → jugador que lo envía (si existe) |
| Evento | `kiArenaEvents` | auto-ID | `…/environments/{APP_ENV}/kiArenaEvents/{id}` | `victimRef`, `killerRef` → jugadores |
| Ajustes | `kiArenaSettings` | `gameplay` | `…/environments/{APP_ENV}/kiArenaSettings/gameplay` | — |

**Compatibilidad (permanente):** los documentos antiguos no tienen estos campos y siguen siendo válidos. Al leer: `id` ausente → ID del documento; `reference` ausente → se permite; `isActive` ausente → activo. Al volver a escribir un documento antiguo se pueden completar los que falten, sin cambiar un `isActive` existente. No hace falta un backfill; si Pedro lo quiere, es opcional y requiere su aprobación.

## Regla 2 — Entorno por variable: `dev`, `qa`, `prd`

- El entorno sale de **una sola variable**, `APP_ENV`, con exactamente tres valores: `dev` (desarrollo), `qa` (QA) y `prd` (producción). No se usa `prod`.
- **Estructura de rutas (Pedro, 2026-10-24).** En la raíz de Firestore hay una colección `environments`; dentro, un documento por entorno (`dev`, `qa`, `prd`); y dentro de cada documento van todas las colecciones de la app. Cada entorno es una base de datos completa y separada:

  ```
  (raíz)
  └── environments                 ← colección raíz
      ├── dev                      ← documento del entorno = base de datos de desarrollo
      │   ├── kiArenaPlayers/{id}
      │   ├── kiArenaUsers/{uid}
      │   ├── kiArenaMessages/{id}
      │   └── …                    ← todas las demás colecciones
      ├── qa                       ← base de datos de QA (mismas colecciones)
      └── prd                      ← base de datos de producción (mismas colecciones)
  ```

  Cambiar de entorno = cambiar el segmento que va justo después de `environments/` en la ruta. Ninguna colección de la app vive fuera de `environments/{APP_ENV}/`.
- Toda ruta a Firestore se construye a partir de `APP_ENV` en un único módulo (`public/src/config/environment.js` propuesto): `environments/{APP_ENV}/kiArenaPlayers`, `…/kiArenaMessages`, `…/kiArenaEvents`, `…/kiArenaSettings/gameplay`.
- Ningún otro archivo escribe rutas, prefijos ni nombres de entorno a mano.
- Como es un sitio estático, `APP_ENV` se fija en el despliegue (un `env.js` generado por destino de Hosting o equivalente). Un valor ausente o inválido DEBE mostrar un error visible; solo en local se permite caer a `dev`.
- Si se mantiene el selector `?env=` en la URL, solo acepta `dev|qa|prd` (decisión pendiente con Pedro).
- Los datos que hoy viven en `environments/prod/…` necesitan migrarse a `environments/prd/…` (copia, sin borrar el origen; requiere aprobación de Pedro).

## Regla 3 — Ejecución y depuración por entorno (Pedro, 2026-10-22)

Toda pieza que se ejecuta o depura (web/Hosting, Cloud Functions, Electron y las que vengan) DEBE tener configuración de ejecución y depuración para **cada** entorno: `dev`, `qa` y `prd`.

- **El entorno sale de una fuente de configuración, nunca del código ni de cada launch.** Un archivo por entorno (p. ej. `config/env/.env.dev`, `.env.qa`, `.env.prd`) fija `APP_ENV`, el proyecto Firebase y si se usan emuladores. Cambiar de entorno = elegir otro archivo o valor, no editar código.
- **VS Code:** `launch.json` y `tasks.json` reciben el entorno por un selector (`inputs` con `pickString` dev/qa/prd) o por configuraciones por entorno que leen su `envFile`. Las configuraciones existentes (Login en Chrome, Functions, Electron proceso principal/ventana, compuestas «login + functions» y «Electron completo») DEBEN existir para los tres entornos.
- **Multiplataforma:** Windows y macOS. Usar scripts Node en lugar de comandos de shell propios de un sistema; si hace falta, bloques `windows`/`osx` en las tareas.
- **Protección de `prd`:** `dev` es el valor por defecto. Ejecutar contra `prd` pide confirmación explícita; nunca se siembran datos ni se escriben datos reales de `prd` desde una sesión de depuración sin aprobación de Pedro.
- **Secretos:** los archivos de entorno versionados solo llevan valores públicos (`APP_ENV`, `projectId`, `clientId`); los secretos van en `.env.*.local` ignorados por Git o en Secret Manager, con un `.env.example` documentado.
- Referencia de implementación: hilo «Depurar Ki Arena en Windows» (`.vscode/launch.json`, `.vscode/tasks.json`, `scripts/emulators.js`).
