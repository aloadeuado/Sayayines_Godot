# Ki Arena de escritorio

Envoltorio de Electron sobre la web de Ki Arena. Abre el login y, desde el menú **Ki Arena**, la ventana de la arena (⌘1), el login (⌘2), `/bot` (⌘3), `/settings` (⌘4) y el panel de superadministrador `/admin` (⌘5).

La arena se abre en su propia ventana, «Ki Arena · Arena», con solo el canvas: es la que se captura en OBS (Captura de ventana; en Windows, método «Windows 10 (1903 y posterior)»). En **Ki Arena › Orientación de la arena** se elige Horizontal (5:3, 1200×720) o Vertical (9:16, 540×960, para TikTok); la elección se guarda entre sesiones. Los enlaces «Volver a la arena» abren esa ventana en lugar de cargar la arena en la principal.

La app sirve una copia de `KiArena/public` en `http://localhost:47321` (puerto fijo para que la sesión de Firebase sobreviva al reiniciar; si está ocupado usa otro), porque `localhost` está autorizado por defecto en Firebase Auth.

`/api/auth/**` (login): primero se reenvía a la función `authApi` desplegada. Si Google responde 404 porque la función no está desplegada (plan Spark), o no hay conexión, la app usa el **login local**: el mismo código de `functions/src` (copiado en `app-auth/`), con Firestore por REST y el ID token verificado en Google (`accounts:lookup`). Email y Google funcionan igual; Twitch, Kick y TikTok siguen necesitando la función, porque solo ella puede firmar el token.

Variables opcionales: `KI_ARENA_ENV` (`dev`, `qa` o `prd`; por defecto `dev`), `KI_ARENA_API_BASE`, `KI_ARENA_AUTH_MODE` (`auto` por defecto, `local` o `remote`) y `KI_ARENA_PORT`.

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
- Sin la función `authApi` desplegada, el login con email y Google usa el modo local; los métodos tienen que estar activados en Firebase Authentication.
- Twitch, Kick y TikTok terminan el login en el dominio web registrado como `redirectUri`, no dentro de la app. Volver a la app tras ese login queda pendiente (por ejemplo, con un esquema `kiarena://`).
- La app no está firmada ni notarizada.
