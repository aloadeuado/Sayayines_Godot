---
name: poderes-ki
description: Trabajar en los poderes V (Rayo Mortal), M (Makankosappo), K (Kamehameha) de Ki Arena o añadir uno nuevo: desbloqueo, cooldown, animación, anchura, hitbox y daño.
---

# Ki Arena · poderes-ki

## Reglas obligatorias (siempre)

Antes de tocar datos o rutas, aplica la skill `reglas-desarrollo` (`.kiro/steering/reglas-datos.md`): todo modelo Firestore lleva `id`, `reference` e `isActive` con borrado suave (nunca `DELETE`), y las rutas salen de `APP_ENV` = `dev` | `qa` | `prd`.

## Antes de empezar

1. Lee `.kiro/steering/` (product, tech, structure, reglas-datos).
2. Lee la spec `.kiro/specs/poderes-ki/` completa: `requirements.md`, `design.md`, `tasks.md`.
3. Lee el inicio de `KiArena/docs/CHANGELOG.md` y la sección pertinente de `KiArena/docs/PROJECT_SPEC.md`.
4. Revisa el código actual: si contradice la spec, el código manda y la spec se corrige en el mismo cambio.

## Archivos del área

- `KiArena/public/src/config/gameplay-settings.js` (`POWER_UNLOCK_LEVELS`, `powerBlockReason`, `powerMultiplierAtLevel`, defaults)
- `KiArena/public/src/game/arena.js` (`executePower`, `launch*`, `fire*`, `beamWidth`, `*HitRadius`, `*Damage`, `FREEZER_POWER_PROGRESSION`)
- `KiArena/public/src/app/bot-app.js`, `KiArena/public/bot/index.html`
- `KiArena/public/src/app/settings-app.js`
- `KiArena/public/src/services/firebase/arena-cloud.js` (regex de `command`)

## Reglas del área

- Desbloqueo: `V` solo Freezer nivel 1; `M` nivel 10 y `K` nivel 20 para todas las razas. Validar en Bot **y** en arena con `powerBlockReason`.
- Un comando bloqueado se rechaza con motivo y nunca dispara otro poder.
- Anchura dibujada, radio de impacto y daño deben salir de la misma función; comprobar con el overlay de hitboxes.
- El perfil Freezer (técnica posterior = más delgada y más dañina) aplica solo a Freezer.
- Para un poder nuevo seguir la checklist de `.kiro/specs/poderes-ki/design.md` completa: reglas, Settings, arena, Bot, regex, docs.
- Probar desbloqueos con aserciones Node justo debajo y en el umbral, Freezer y no Freezer.

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
