---
name: progresion-rpg
description: Trabajar en niveles 1–100, atributos derivados, fórmulas de XP, subida de nivel y migración de HP de Ki Arena.
---

# Ki Arena · progresion-rpg

## Reglas obligatorias (siempre)

Antes de tocar datos o rutas, aplica la skill `reglas-desarrollo` (`.kiro/steering/reglas-datos.md`): todo modelo Firestore lleva `id`, `reference` e `isActive` con borrado suave (nunca `DELETE`), y las rutas salen de `APP_ENV` = `dev` | `qa` | `prd`.

## Antes de empezar

1. Lee `.kiro/steering/` (product, tech, structure, reglas-datos).
2. Lee la spec `.kiro/specs/progresion-rpg/` completa: `requirements.md`, `design.md`, `tasks.md`.
3. Lee el inicio de `KiArena/docs/CHANGELOG.md` y la sección pertinente de `KiArena/docs/PROJECT_SPEC.md`.
4. Revisa el código actual: si contradice la spec, el código manda y la spec se corrige en el mismo cambio.

## Archivos del área

- `KiArena/public/src/config/gameplay-settings.js` (`calculateLevelStats`, `normalizeGameSettings`)
- `KiArena/public/src/game/arena.js` (`gain`, `xpForNext`, `make`, `applySettingsToFighters`)
- `KiArena/public/src/app/bot-app.js` (`xpForNext` duplicada)

## Reglas del área

- El nivel y la XP son datos de Firestore; nunca inferirlos de bajas ni del nombre.
- Los atributos se derivan de `N` y los multiplicadores; no guardarlos como campos.
- Al cambiar fórmulas, conservar el porcentaje de HP de cada luchador.
- `xpForNext` existe en dos archivos: si cambias una, cambia la otra (o centralízala, tarea 2.1).
- Verificar con un script `node --input-type=module` que importe `gameplay-settings.js` y compare con la tabla de `design.md`.

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
