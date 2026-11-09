# Funciones de Ki Arena: login y cuentas vinculadas

La función `authApi` (Cloud Functions v2, Node 20) atiende `/api/auth/**` a través de Firebase Hosting. Escribe el modelo de usuarios y cuentas descrito en `KiArena/docs/FIRESTORE.md` y en `.kiro/specs/autenticacion-usuarios/`.

## Probar sin Firebase real

```bash
cd KiArena/functions
npm install
npm run check   # node --check de todos los módulos
npm test        # modelo de cuentas y API contra un Firestore en memoria
```

## Probar todo en local con el Emulator Suite

Necesita Node 20+ y Java 11+. No toca el proyecto real: usa el proyecto de prueba `demo-ki-arena`.

```bash
cd KiArena
npm install
npm run emulators
```

El script instala lo que falte, levanta Auth, Firestore, Functions y Hosting, siembra el catálogo en `dev` y `qa` y muestra las URL:

- Login: `http://localhost:5000/login?env=dev&emulators=1`
- Emulator UI (usuarios de Auth y datos de Firestore): `http://localhost:4000`

En el emulador, Twitch, Kick y TikTok se reemplazan por una pantalla local donde se escribe el ID y el usuario de la cuenta simulada. Google y Apple usan el popup de cuentas falsas del emulador de Auth. Los datos se borran al cerrar con Ctrl+C. La función se recarga sola al editar `functions/`.

## Lo que hay que configurar antes de desplegar (por entorno)

1. **Firebase Authentication › Métodos de acceso**: activar *Correo electrónico/contraseña*, *Google* y, cuando haya cuenta, *Apple*. En *Configuración › Vinculación de cuentas de usuario* elegir «Crear varias cuentas para cada proveedor de identidad», para que un email repetido no bloquee el login: Ki Arena vincula cuentas solo desde `/cuenta`.
2. **Dominios autorizados** en Firebase Authentication: el dominio de Hosting de cada entorno.
3. **Apps OAuth** en cada plataforma, con la URL de retorno `https://<dominio>/api/auth/oauth/callback/<proveedor>`:
   - Twitch: consola de desarrolladores de Twitch.
   - Kick: Kick › Configuración › Desarrollador.
   - TikTok: portal de TikTok for Developers con Login Kit for Web (pasa revisión de la app).
4. **Secretos** en Secret Manager (deben existir los tres para desplegar; puede ser un valor provisional si aún no hay app):
   ```bash
   firebase functions:secrets:set TWITCH_CLIENT_SECRET
   firebase functions:secrets:set KICK_CLIENT_SECRET
   firebase functions:secrets:set TIKTOK_CLIENT_SECRET
   ```
5. **Catálogo** `environments/{env}/kiArenaProviderTypes`: sembrar con el script (simula por defecto y nunca pisa campos existentes), y luego poner `clientId` y `redirectUri` de cada plataforma en su documento:
   ```bash
   node scripts/seed-provider-types.js dev          # muestra lo que haría
   node scripts/seed-provider-types.js dev --apply  # escribe (requiere aprobación)
   ```
6. **Plan Blaze** del proyecto Firebase: Cloud Functions y Secret Manager lo requieren.

Un proveedor sin `clientId` o `redirectUri` aparece en la pantalla como «pronto» y la API responde `provider_not_configured`.

## Rutas

| Método y ruta | Uso |
| --- | --- |
| `GET /api/auth/providers?env=` | Catálogo visible |
| `POST /api/auth/session` | Registra el login con email, Google o Apple, o un vínculo nativo (`mode: "link"`) |
| `GET /api/auth/me?env=` | Usuario y cuentas vinculadas |
| `POST /api/auth/profile` | Cambia el nombre visible |
| `POST /api/auth/oauth/start` | URL de autorización de TikTok, Twitch o Kick (`mode: "login"` o `"link"`) |
| `GET /api/auth/oauth/callback/:provider` | Cambia el código, resuelve el usuario y vuelve a `/login` o `/cuenta` |
| `POST /api/auth/unlink` | Desvincula una cuenta (nunca la última) |

Todas las rutas con sesión usan `Authorization: Bearer <ID token de Firebase>`.
