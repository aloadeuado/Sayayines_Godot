---
inclusion: always
---

# Tecnología

## Stack

- **Frontend:** HTML5, CSS y JavaScript con ES modules nativos. Sin bundler, sin framework, sin `package.json` en el repositorio.
- **Render:** Canvas 2D (`<canvas id="game" width="900" height="540">`) con `requestAnimationFrame`.
- **Datos:** Cloud Firestore por su **API REST** (`firestore.googleapis.com/v1`) usando la API key web del proyecto. No se usa el SDK de Firebase ni listeners en tiempo real; se hace polling.
- **Hosting:** Firebase Hosting sirve `KiArena/public/` con `cleanUrls` y rewrites para `/bot` y `/settings` (`KiArena/firebase.json`).
- **Proyecto Firebase:** `sayayin-c0dfe`, base `(default)`.

## Entornos

**Regla vigente (2026-10-22):** el entorno sale de la variable `APP_ENV` = `dev` | `qa` | `prd` y todas las rutas `environments/{APP_ENV}/…` se construyen en un único módulo. Ver `reglas-datos.md`.

**Código actual (pendiente de corregir):** `?env=dev|qa|prod` en la URL (por defecto `dev`) elige el prefijo. Los tres comparten el mismo proyecto Firebase: es separación **lógica**, no de seguridad, cuotas ni facturación.

## Comandos habituales

```bash
# Servir en local (desde KiArena/)
firebase emulators:start --only hosting --project sayayin-c0dfe   # en Windows: firebase.cmd
# http://127.0.0.1:5000/  ·  /bot  ·  /settings

# Verificación estática obligatoria antes de entregar
for f in $(git ls-files 'KiArena/public/src/*.js'); do node --check "$f"; done
git diff --check
```

Para probar fórmulas o desbloqueos sin navegador, importa `KiArena/public/src/config/gameplay-settings.js` desde un script Node (`node --input-type=module`) y haz aserciones; ese módulo no toca el DOM ni Firestore.

## Restricciones técnicas

- No usar `localStorage`/`sessionStorage` como fuente de verdad de jugadores, chat, settings ni progreso.
- No poner secretos (Client Secret de Twitch, tokens, credenciales de servicio) en `public/` ni en Firestore legible.
- La API key web identifica el proyecto; no es una credencial secreta ni sustituye reglas de acceso.
- Las reglas Firestore actuales son públicas (lectura/escritura). No probar con escrituras sobre perfiles reales: usar `qa` o el Emulator Suite.
- Los timeouts de red de Firestore son de 10 s (`AbortSignal.timeout(10000)`).
- `arena-cloud.js` y `arena.js` están escritos en estilo compacto (líneas muy largas). Respetar ese estilo al editarlos o, si se reformatea, hacerlo en un cambio aparte y verificado.

## Intervalos de sincronización

| Vista | Qué | Cada |
|---|---|---|
| `/` arena | mensajes/comandos | 2.5 s |
| `/` arena | roster de Firestore | 8 s |
| `/bot` | chat | 2.5 s |
| `/bot` | roster y feed de combate | 4 s |
