---
name: settings-juego
description: Trabajar en la pantalla /settings de Ki Arena: multiplicadores de atributos, curvas de poderes, poderes pendientes y razas elegibles por entorno.
---

# Ki Arena · settings-juego

> **Rutas Firestore (obligatorio):** todo modelo de este módulo vive en `environments/{APP_ENV}/{colección}/{id}`: colección raíz `environments`, un documento por entorno (`dev`, `qa`, `prd`) y dentro todas las colecciones. Cualquier ruta abreviada en este archivo (`kiArenaX/{id}`) cuelga de ese prefijo. Ver `.kiro/steering/reglas-datos.md`.

## Reglas obligatorias (siempre)

Antes de tocar datos o rutas, aplica la skill `reglas-desarrollo` (`.kiro/steering/reglas-datos.md`): todo modelo Firestore lleva `id`, `reference` e `isActive` con borrado suave (nunca `DELETE`), y las rutas salen de `APP_ENV` = `dev` | `qa` | `prd`.

## Antes de empezar

1. Lee `.kiro/steering/` (product, tech, structure, reglas-datos).
2. Lee la spec `.kiro/specs/settings-juego/` completa: `requirements.md`, `design.md`, `tasks.md`.
3. Lee el inicio de `KiArena/docs/CHANGELOG.md` y la sección pertinente de `KiArena/docs/PROJECT_SPEC.md`.
4. Revisa el código actual: si contradice la spec, el código manda y la spec se corrige en el mismo cambio.

## Archivos del área

- `KiArena/public/settings/index.html`
- `KiArena/public/src/app/settings-app.js` (`render`, `readForm`, `validate`, `startSettings`)
- `KiArena/public/src/config/gameplay-settings.js`
- `KiArena/public/src/services/firebase/arena-cloud.js` (`getSettings`, `saveSettings`)

## Reglas del área

- Todo poder o estadística implementada debe tener control aquí; los del catálogo sin implementar se muestran como pendientes y no afectan combate.
- Mantener las validaciones de orden (curvas crecientes; Makankosappo > Kamehameha genérico; Freezer V < M < K) o actualizarlas junto con la spec.
- Desactivar una raza solo afecta a perfiles nuevos.
- Solo se escribe `environments/{env}/kiArenaSettings/gameplay` del entorno elegido; nunca guardar en `prd` para probar.
- Recuerda: la arena lee Settings solo al arrancar.

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
