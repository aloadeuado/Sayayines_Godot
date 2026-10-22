# Specs de Ki Arena

Arquitectura estilo Kiro: cada carpeta es un área funcional con

- `requirements.md`: historias de usuario (`HU-XXX-NN`) con criterios de aceptación EARS en español.
- `design.md`: componentes, flujo, datos y decisiones, enlazados al código real.
- `tasks.md`: `[x]` implementado y verificado en código; `[ ]` pendiente.

Cada spec tiene una skill de Claude en `.claude/skills/<spec>/SKILL.md`. El contexto global está en `.kiro/steering/`.

| Spec | Prefijo HU | Estado |
|---|---|---|
| [arena-en-vivo](arena-en-vivo/) | ARE | Implementada · 1 defecto conocido (clic) |
| [entrada-jugadores](entrada-jugadores/) | ENT | Implementada |
| [movimiento-y-duelos](movimiento-y-duelos/) | DUE | Implementada |
| [poderes-ki](poderes-ki/) | POD | Implementada (V, M, K) |
| [progresion-rpg](progresion-rpg/) | RPG | Implementada |
| [settings-juego](settings-juego/) | SET | Implementada |
| [panel-bot](panel-bot/) | BOT | Implementada |
| [persistencia-firestore](persistencia-firestore/) | FS | Implementada |
| [rafaga-ki-b](rafaga-ki-b/) | B | Pendiente · existe solo en local de Pedro |
| [integracion-twitch](integracion-twitch/) | TW | Pendiente · revisar rama `Twitch` |
| [integracion-tiktok](integracion-tiktok/) | TT | Pendiente · existe solo en local de Pedro |
| [app-escritorio-electron](app-escritorio-electron/) | DSK | Pendiente · existe solo en local de Pedro |
| [seguridad-y-autoridad](seguridad-y-autoridad/) | SEC | Pendiente |
| [autenticacion-usuarios](autenticacion-usuarios/) | AUT | En desarrollo · login con email, Google, Apple, TikTok, Twitch y Kick |

## Reglas obligatorias

Todas las specs cumplen `.kiro/steering/reglas-datos.md`: cada modelo Firestore con `id`, `reference` e `isActive` (borrado suave, nunca `DELETE`) y rutas desde `APP_ENV` = `dev|qa|prd`. Las correcciones de código que faltan están en la sección 3 de `tasks.md` de cada spec.

## Flujo para una funcionalidad nueva

1. **Requisitos:** crear o ampliar `requirements.md` con la HU y sus criterios EARS. Confirmar con Pedro si cambia el producto.
2. **Diseño:** actualizar `design.md` con archivos tocados, datos y decisiones.
3. **Tareas:** descomponer en `tasks.md`, cada tarea con referencia `_HU-…_`.
4. **Implementar** una tarea a la vez, con cambios mínimos.
5. **Reglas de datos:** comprobar la checklist de la skill `reglas-desarrollo`.
6. **Verificar:** `node --check`, `git diff --check`, aserciones Node de fórmulas; nunca escribir en Firestore real.
7. **Cerrar:** marcar `[x]`, actualizar `KiArena/docs/PROJECT_SPEC.md` si cambió una regla y añadir entrada en `KiArena/docs/CHANGELOG.md`.

## Formato EARS usado

| Patrón | Plantilla |
|---|---|
| Ubicuo | El sistema DEBE … |
| Evento | CUANDO <evento>, el sistema DEBE … |
| Estado | MIENTRAS <estado>, el sistema DEBE … |
| No deseado | SI <condición>, ENTONCES el sistema DEBE … |
| Opcional | DONDE <característica>, el sistema DEBE … |
