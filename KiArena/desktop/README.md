# Ki Arena de escritorio

Envoltorio de Electron sobre la web de Ki Arena. Abre el login y, desde el menú **Ki Arena**, la arena (⌘1), el login (⌘2), `/bot` (⌘3) y `/settings` (⌘4).

La app sirve una copia de `KiArena/public` en `http://localhost:<puerto>`, porque `localhost` está autorizado por defecto en Firebase Auth. Las llamadas a `/api/auth/**` se reenvían a la función `authApi` desplegada. Variables opcionales: `KI_ARENA_ENV` (`dev`, `qa` o `prd`; por defecto `dev`) y `KI_ARENA_API_BASE`.

## Desarrollo

```bash
cd KiArena/desktop
npm install
npm start
```

## Compilar

```bash
npm run build                      # macOS Apple Silicon, macOS Intel y Windows x64 en dist/
node scripts/build.js darwin-arm64  # solo uno
```

Si la descarga de Electron falla, se pueden bajar los zip de la versión fijada en `package.json` desde las releases de Electron y pasar la carpeta en `ELECTRON_ZIP_DIR`.

## Abrir en macOS (app sin firmar)

1. Descomprime el zip y mueve `Ki Arena.app` a Aplicaciones.
2. En Terminal:
   ```bash
   xattr -cr "/Applications/Ki Arena.app"
   codesign --force --deep --sign - "/Applications/Ki Arena.app"
   ```
3. Ábrela con doble clic. Si macOS aún la bloquea: Ajustes del Sistema › Privacidad y seguridad › «Abrir igualmente».

## Abrir en Windows

Descomprime el zip y ejecuta `KiArena.exe`. Si aparece SmartScreen: «Más información» › «Ejecutar de todas formas».

## Límites actuales

- Sin internet se ven las pantallas, pero la arena, `/bot`, `/settings` y el login necesitan Firebase.
- El login necesita la función `authApi` desplegada y los métodos activados en Firebase Authentication.
- Twitch, Kick y TikTok terminan el login en el dominio web registrado como `redirectUri`, no dentro de la app. Volver a la app tras ese login queda pendiente (por ejemplo, con un esquema `kiarena://`).
- La app no está firmada ni notarizada.
