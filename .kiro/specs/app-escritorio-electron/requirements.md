# Requisitos — App de escritorio (Electron, Windows) · PENDIENTE

> **Estado:** no está en el repositorio. El contexto de Pedro describe `package.json`, `desktop/main.cjs`, `scripts/` y builds en `dist/windows/` que existen solo en su equipo.

## Introducción

Una app portable de Windows abre la arena 9:16 y el panel de control en ventanas separadas, para que el operador no toque la ventana capturada por OBS. Los datos siguen en Firestore.

## Requisitos

### HU-DSK-01 — Ventanas separadas
**Historia de usuario:** Como streamer, quiero un ejecutable que abra la arena y otro (o una opción) que abra el control, para operar sin alterar la escena.

**Criterios de aceptación**
1. El ejecutable del juego DEBE abrir `/` en una ventana 9:16.
2. El lanzador de control DEBE abrir `/bot` (y acceso a `/settings`) en otra ventana.

### HU-DSK-02 — Servir archivos locales
**Criterios de aceptación**
1. La app DEBE servir `public/` por un servidor HTTP solo de loopback.
2. La app DEBE requerir Internet para Firestore y mostrar el error si no hay conexión.

### HU-DSK-03 — Build reproducible
**Criterios de aceptación**
1. `npm run start:desktop`, `npm run start:control` y `npm run build:windows` DEBEN funcionar desde el repositorio.
2. `dist/` NO DEBE versionarse; los artefactos se generan.

### HU-DSK-04 — Entorno
**Criterios de aceptación**
1. Cada build DEBE fijar `APP_ENV` (`dev|qa|prd`) y mostrarlo en la ventana de control.
