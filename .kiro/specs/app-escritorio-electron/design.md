# Diseño — Electron · PENDIENTE

- `desktop/main.cjs`: crea `BrowserWindow` para arena (9:16) y control; levanta un servidor estático en `127.0.0.1` sobre `public/`.
- `package.json` en `KiArena/` con scripts `start:desktop`, `start:control`, `build:windows`.
- Añadir `dist/` y `node_modules/` a `.gitignore`.
- Electron no es backend: no guarda datos ni secretos.
