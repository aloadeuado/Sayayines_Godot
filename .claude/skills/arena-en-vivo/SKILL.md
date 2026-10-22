---
name: arena-en-vivo
description: Trabajar en la vista de arena / de Ki Arena: canvas, render, sprites, auras, barras, hitboxes, arranque resiliente y selección por clic.
---

# Ki Arena · arena-en-vivo

## Reglas obligatorias (siempre)

Antes de tocar datos o rutas, aplica la skill `reglas-desarrollo` (`.kiro/steering/reglas-datos.md`): todo modelo Firestore lleva `id`, `reference` e `isActive` con borrado suave (nunca `DELETE`), y las rutas salen de `APP_ENV` = `dev` | `qa` | `prd`.

## Antes de empezar

1. Lee `.kiro/steering/` (product, tech, structure, reglas-datos).
2. Lee la spec `.kiro/specs/arena-en-vivo/` completa: `requirements.md`, `design.md`, `tasks.md`.
3. Lee el inicio de `KiArena/docs/CHANGELOG.md` y la sección pertinente de `KiArena/docs/PROJECT_SPEC.md`.
4. Revisa el código actual: si contradice la spec, el código manda y la spec se corrige en el mismo cambio.

## Archivos del área

- `KiArena/public/index.html`
- `KiArena/public/src/game/arena.js` (`start`, `frame`, `draw`, `drawAura`, `drawChargeAura`, `drawHitboxes`, `sprite`, listener `click`)
- `KiArena/public/styles/arena.css`
- `KiArena/public/assets/`

## Reglas del área

- El render (`requestAnimationFrame`) arranca **antes** de cualquier `await` a Firestore. Nunca mover un `await` delante.
- Un fallo de Firebase se informa en `#firebase-status`/chat y la arena sigue dibujando.
- `/` no tiene formularios ni panel de operador; todo acceso al DOM en `arena.js` comprueba nulidad.
- Si cambias geometría visible de algo que colisiona, actualiza también `drawHitboxes` y el radio de impacto.
- `arena.js` usa estilo compacto de líneas largas: edita con reemplazos exactos y pequeños.
- Defecto conocido: el clic usa `f.y-x` (tarea 2.1 de la spec).

## Cómo trabajar una tarea

1. Elige la tarea en `tasks.md` (o crea la HU y la tarea si es nueva).
2. Haz el cambio mínimo que cumpla sus criterios EARS.
3. Revisa el flujo de punta a punta: entrada → validación → arena → efecto visual → daño/colisión → persistencia → Settings → docs.
4. Marca la tarea `[x]` solo si quedó implementada y verificada.

## Verificación antes de entregar

```bash
for f in $(git ls-files 'KiArena/public/src/*.js'); do node --check "$f"; done
git diff --check
```

- No abrir el navegador ni las ventanas de stream de Pedro; no escribir, borrar ni migrar datos reales de Firestore.
- Añadir entrada fechada en `KiArena/docs/CHANGELOG.md` (solicitud, archivos, verificación, rama/commit).
- Si cambia una regla, actualizar `KiArena/docs/PROJECT_SPEC.md` y los criterios de la spec; marcar las tareas `[x]`.
- No hacer commit, push ni deploy sin pedido explícito.
