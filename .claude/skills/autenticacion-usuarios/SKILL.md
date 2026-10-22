---
name: autenticacion-usuarios
description: Trabajar en el login de Ki Arena - email y contraseña, Google, Apple, TikTok, Twitch y Kick, cuentas vinculadas desde Configuración y el modelo providerTypes, providers, userProviders y users.
---

# Ki Arena · autenticacion-usuarios

## Reglas obligatorias (siempre)

Antes de tocar datos o rutas, aplica la skill `reglas-desarrollo` (`.kiro/steering/reglas-datos.md`): todo modelo Firestore lleva `id`, `reference` e `isActive` opcionales con borrado suave (nunca `DELETE`), las relaciones son referencias completas del mismo entorno y las rutas salen de `APP_ENV` = `dev` | `qa` | `prd`.

## Antes de empezar

1. Lee `.kiro/steering/` y la spec `.kiro/specs/autenticacion-usuarios/` completa (la tabla de proveedores y los JSON de ejemplo están en `design.md`).
2. Fuente original: documento «Datos de usuario por proveedor de login».
3. Revisa las preguntas abiertas de `requirements.md`; no las decidas tú: pregúntale a Pedro.

## Reglas del área

- La llave de cada cuenta externa es su ID estable (`sub`, `open_id`, `user_id`); el email nunca une cuentas.
- Cuatro colecciones: `kiArenaProviderTypes` → `kiArenaProviders` → `kiArenaUserProviders` ← `kiArenaUsers`, más `kiArenaUserProviderEvents`.
- Vincular y desvincular ocurre en transacciones del servidor; una cuenta externa nunca queda activa en dos usuarios; nunca se desvincula la última.
- Secrets y tokens solo en servidor o Secret Manager; nada en `public/` ni en Firestore legible.
- Escritura de estas colecciones solo desde Cloud Functions / Admin SDK.
- Pruebas solo en `dev` o en el emulador; no tocar datos reales de `qa` ni `prd`.
- La pantalla tiene estilo DBZ y no aparece en la vista `/` del stream.

## Verificación antes de entregar

```bash
for f in $(git ls-files 'KiArena/public/src/*.js'); do node --check "$f"; done
git diff --check
```

- Añadir entrada fechada en `KiArena/docs/CHANGELOG.md` y marcar tareas en `tasks.md`.
- No hacer commit, push ni deploy sin pedido explícito de Pedro.
