# Diseño — Electron · PENDIENTE

> **Rutas Firestore (obligatorio):** todo modelo de este módulo vive en `environments/{APP_ENV}/{colección}/{id}`: colección raíz `environments`, un documento por entorno (`dev`, `qa`, `prd`) y dentro todas las colecciones. Cualquier ruta abreviada en este archivo (`kiArenaX/{id}`) cuelga de ese prefijo. Ver `.kiro/steering/reglas-datos.md`.

- `desktop/main.cjs`: crea `BrowserWindow` para arena (9:16) y control; levanta un servidor estático en `127.0.0.1` sobre `public/`.
- `package.json` en `KiArena/` con scripts `start:desktop`, `start:control`, `build:windows`.
- Añadir `dist/` y `node_modules/` a `.gitignore`.
- Electron no es backend: no guarda datos ni secretos.
