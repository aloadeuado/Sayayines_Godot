---
name: panel-bot
description: Trabajar en el panel de operador /bot de Ki Arena: chat simulado, envío de comandos, roster, Elegir/Ingresar/Agregar todos, métricas y feed de combate.
---

# Ki Arena · panel-bot

## Reglas obligatorias (siempre)

Antes de tocar datos o rutas, aplica la skill `reglas-desarrollo` (`.kiro/steering/reglas-datos.md`): todo modelo Firestore lleva `id`, `reference` e `isActive` con borrado suave (nunca `DELETE`), y las rutas salen de `APP_ENV` = `dev` | `qa` | `prd`.

## Antes de empezar

1. Lee `.kiro/steering/` (product, tech, structure, reglas-datos).
2. Lee la spec `.kiro/specs/panel-bot/` completa: `requirements.md`, `design.md`, `tasks.md`.
3. Lee el inicio de `KiArena/docs/CHANGELOG.md` y la sección pertinente de `KiArena/docs/PROJECT_SPEC.md`.
4. Revisa el código actual: si contradice la spec, el código manda y la spec se corrige en el mismo cambio.

## Archivos del área

- `KiArena/public/bot/index.html`
- `KiArena/public/src/app/bot-app.js`

## Reglas del área

- `/bot` es productor: solo escribe mensajes en `kiArenaMessages`; no crea perfiles ni ejecuta combate.
- Validar nombre, existencia de perfil y desbloqueo antes de guardar un poder.
- Escapar siempre HTML de nombres y mensajes (`escapeHtml`).
- «Elegir» (remitente) e inspección son selecciones independientes.
- Cualquier simulación (p. ej., regalos) debe rotularse como simulación.

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
