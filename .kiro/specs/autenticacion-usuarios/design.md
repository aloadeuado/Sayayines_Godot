# Diseño — Autenticación de usuarios y cuentas vinculadas

Fuente completa: [Datos de usuario por proveedor de login](https://claude.ai/artifact/Py4V8nWMmAZAqCqtNB2dC6). Regla general: el único dato que sirve como llave es el **ID estable** de cada proveedor; email y nombre son perfil, pueden faltar o cambiar.

## Comparativa por proveedor

| Proveedor | ID estable (llave) | Perfil que entrega | Email | Scopes mínimos | Requisitos |
|---|---|---|---|---|---|
| Email/contraseña | uid de Firebase | lo que escriba el usuario | sí (el de registro) | — | Firebase Auth nativo |
| Google | `sub` (nunca se reutiliza) | name, given/family_name, picture, locale; `hd` en Workspace | email + email_verified | openid, email, profile | Pantalla de consentimiento; nativo en Firebase Auth |
| Apple | `sub` (por equipo) | nombre **solo en la primera autorización** | en cada login; puede ser relay `@privaterelay.appleid.com` | name, email | Apple Developer Program de pago, Services ID, dominio verificado; nativo en Firebase Auth |
| TikTok | `open_id` (por app); `union_id` entre apps del mismo developer | display_name, avatar_url; con user.info.profile: username, bio, is_verified, profile_deep_link | no existe | user.info.basic | App registrada; redirect https estática; scopes extra pasan revisión; code exchange con secret → servidor |
| Twitch | `sub` del ID token (= id Helix, = user-id del chat) | preferred_username, picture; Helix: login, display_name, broadcaster_type… | email + verified; null si no verificado | openid (+ user:read:email si se pide) | App en la consola de Twitch |
| Kick | `user_id` (entero) | name, profile_picture | aparece en la respuesta | user:read | OAuth 2.1 + PKCE S256; sin OIDC: `GET /public/v1/users`; introspect en `POST /oauth/token/introspect` |

Notas: TikTok no da email (no se puede unir por email) y `open_id` cambia si cambia la app; Twitch `sub` es el mismo ID que llega en EventSub/IRC; Google advierte que el email puede cambiar; en Apple `email_verified` e `is_private_email` pueden venir como string `"true"`.

## Arquitectura

```text
Pantalla DBZ (login/registro)  ──►  Firebase Auth
   │  email+contraseña, Google, Apple: nativo (signIn / linkWithPopup)
   │  TikTok, Twitch, Kick: redirect OAuth ──► Cloud Function auth/{provider}
   │                                             valida, upsert provider, transacción vínculo,
   │                                             createCustomToken(uid) ──► signInWithCustomToken
   ▼
Configuración › Cuentas vinculadas ──► Cloud Function link/unlink (state anti-CSRF, transacción)
```

## Modelo Firestore (`environments/{APP_ENV}/`)

```text
kiArenaProviderTypes   catálogo: password, google, apple, tiktok, twitch, kick (y los que vengan)
        | 1
        | N  providerTypeRef
kiArenaProviders       una cuenta externa con sus datos (todos opcionales)
        | 1
        | N  providerRef
kiArenaUserProviders   tabla intermedia: relaciona un usuario con un proveedor
        | N
        | 1  userRef
kiArenaUsers           el usuario completo de Ki Arena
```

Todo campo `…Ref`/`…Refs` es `referenceValue` con la ruta completa `projects/sayayin-c0dfe/databases/(default)/documents/environments/{APP_ENV}/…`. En los ejemplos se abrevia como `environments/qa/…`. `reference` de cada documento es su propia referencia completa (regla `reglas-datos.md`; el documento fuente mostraba códigos cortos como `provider:twitch:…`, reemplazados por la regla posterior de Pedro).

### Tipo de proveedor — `kiArenaProviderTypes/{code}`
| Campo | Tipo | Contenido |
|---|---|---|
| id | string | `password`, `google`, `apple`, `tiktok`, `twitch`, `kick` |
| reference | referencia | Referencia completa propia |
| isActive | boolean | false = la plataforma deja de ofrecerse |
| code, name, description | string | Código, nombre visible, texto para Configuración |
| authMethod | string | `firebase` (password, Google, Apple) o `customToken` (TikTok, Twitch, Kick) |
| idField | string | `sub`, `open_id`, `user_id` |
| scopes | array string | Scopes que se piden |
| clientId, redirectUri | string | Públicos por entorno; el secreto nunca va aquí |
| givesEmail, allowLogin, allowLink | boolean | Capacidades |
| iconUrl, docsUrl | string | Icono y documentación |
| order | number | Orden en pantalla |
| createdAt, updatedAt | string ISO | Fechas |

### Proveedor — `kiArenaProviders/{providerTypeId}:{providerUserId}`
| Campo | Tipo | Contenido |
|---|---|---|
| id, reference, isActive | — | Campos base (false = cuenta externa dada de baja) |
| providerTypeRef | referencia | Al tipo |
| providerUserId | string | Llave para autenticarse |
| providerUnionId | string | Solo TikTok |
| username, displayName, avatarUrl, profileUrl | string | Perfil |
| email, emailVerified | string, boolean | Si la plataforma lo da |
| isPrivateEmail, firstName, lastName | boolean, string | Solo Apple |
| scopes | array string | Scopes aprobados |
| extra | map | broadcasterType, isVerified, realUserStatus, locale… |
| lastLoginAt, createdAt, updatedAt | string ISO | Fechas |

### Usuario — `kiArenaUsers/{uid}`
| Campo | Tipo | Contenido |
|---|---|---|
| id, reference, isActive | — | uid de Firebase Auth; false = cuenta borrada |
| displayName, avatarUrl, email, emailVerified | — | Datos a mostrar / contacto |
| userProviderRefs | array referencias | Sus vínculos activos |
| primaryUserProviderRef | referencia | Vínculo principal |
| providerTypeRefs | array referencias | Plataformas vinculadas |
| playerRef | referencia | Su jugador en `kiArenaPlayers` |
| roles | array string | `player`, `operator` |
| createdAt, updatedAt, lastLoginAt | string ISO | Fechas |
| schemaVersion | number | 1 |

### Usuario-proveedor — `kiArenaUserProviders/{userId}:{providerId}`
| Campo | Tipo | Contenido |
|---|---|---|
| id, reference, isActive | — | false = desvinculado (con unlinkedAt) |
| userRef, providerRef, providerTypeRef | referencias | Usuario, cuenta externa, plataforma |
| isPrimary | boolean | Vínculo principal |
| linkedAt, unlinkedAt, updatedAt | string ISO | Fechas |

### Historial — `kiArenaUserProviderEvents/{auto-ID}`
`id`, `reference`, `isActive`, `action` (`link`, `unlink`, `relink`, `conflict`), `providerRef`, `userRef`, `otherUserRef` (solo conflictos), `createdAt`.

## Ejemplo completo (QA): Pedro se registra con Google y vincula TikTok, Twitch y Kick

IDs y nombres inventados. Los `…Ref` se muestran abreviados; en Firestore son referencias completas.

**Tipo** `environments/qa/kiArenaProviderTypes/twitch`
```json
{
  "id": "twitch",
  "reference": "environments/qa/kiArenaProviderTypes/twitch",
  "isActive": true,
  "code": "twitch",
  "name": "Twitch",
  "description": "Plataforma de streaming. Login con OAuth + OIDC.",
  "authMethod": "customToken",
  "idField": "sub",
  "scopes": ["openid"],
  "clientId": "abc123qaclientid",
  "redirectUri": "https://qa.ki-arena.example.com/auth/twitch/callback",
  "givesEmail": true,
  "allowLogin": true,
  "allowLink": true,
  "iconUrl": "/assets/providers/twitch.svg",
  "docsUrl": "https://dev.twitch.tv/docs/authentication/getting-tokens-oidc/",
  "order": 3,
  "createdAt": "2026-10-22T18:00:00Z",
  "updatedAt": "2026-10-22T18:00:00Z"
}
```

**Proveedores**
```json
{
  "id": "google:109876543210987654321",
  "reference": "environments/qa/kiArenaProviders/google:109876543210987654321",
  "isActive": true,
  "providerTypeRef": "environments/qa/kiArenaProviderTypes/google",
  "providerUserId": "109876543210987654321",
  "displayName": "Pedro Bem",
  "email": "pedro@example.com",
  "emailVerified": true,
  "scopes": ["openid", "email", "profile"],
  "extra": { "locale": "es" }
}
```
```json
{
  "id": "tiktok:-000aBcD3fGhIjKlMnOpQrStUvWxYz",
  "reference": "environments/qa/kiArenaProviders/tiktok:-000aBcD3fGhIjKlMnOpQrStUvWxYz",
  "isActive": true,
  "providerTypeRef": "environments/qa/kiArenaProviderTypes/tiktok",
  "providerUserId": "-000aBcD3fGhIjKlMnOpQrStUvWxYz",
  "providerUnionId": "c9f1e2d3-4b5a-6789-0abc-def123456789",
  "username": "pedro.dbz",
  "displayName": "Pedro DBZ",
  "scopes": ["user.info.basic", "user.info.profile"],
  "extra": { "isVerified": false }
}
```
```json
{
  "id": "twitch:141981764",
  "reference": "environments/qa/kiArenaProviders/twitch:141981764",
  "isActive": true,
  "providerTypeRef": "environments/qa/kiArenaProviderTypes/twitch",
  "providerUserId": "141981764",
  "username": "pedrodbz",
  "displayName": "PedroDBZ",
  "scopes": ["openid"],
  "extra": { "broadcasterType": "affiliate" }
}
```
```json
{
  "id": "kick:4567890",
  "reference": "environments/qa/kiArenaProviders/kick:4567890",
  "isActive": true,
  "providerTypeRef": "environments/qa/kiArenaProviderTypes/kick",
  "providerUserId": "4567890",
  "username": "pedrodbz",
  "email": "pedro@example.com",
  "scopes": ["user:read"]
}
```

**Usuario** `environments/qa/kiArenaUsers/Xk3fG9qLm2TzR8wYb1Vc`
```json
{
  "id": "Xk3fG9qLm2TzR8wYb1Vc",
  "reference": "environments/qa/kiArenaUsers/Xk3fG9qLm2TzR8wYb1Vc",
  "isActive": true,
  "displayName": "Pedro",
  "email": "pedro@example.com",
  "emailVerified": true,
  "userProviderRefs": [
    "environments/qa/kiArenaUserProviders/Xk3fG9qLm2TzR8wYb1Vc:google:109876543210987654321",
    "environments/qa/kiArenaUserProviders/Xk3fG9qLm2TzR8wYb1Vc:tiktok:-000aBcD3fGhIjKlMnOpQrStUvWxYz",
    "environments/qa/kiArenaUserProviders/Xk3fG9qLm2TzR8wYb1Vc:twitch:141981764",
    "environments/qa/kiArenaUserProviders/Xk3fG9qLm2TzR8wYb1Vc:kick:4567890"
  ],
  "primaryUserProviderRef": "environments/qa/kiArenaUserProviders/Xk3fG9qLm2TzR8wYb1Vc:google:109876543210987654321",
  "providerTypeRefs": [
    "environments/qa/kiArenaProviderTypes/google",
    "environments/qa/kiArenaProviderTypes/tiktok",
    "environments/qa/kiArenaProviderTypes/twitch",
    "environments/qa/kiArenaProviderTypes/kick"
  ],
  "playerRef": "environments/qa/kiArenaPlayers/pedrodbz",
  "roles": ["player", "operator"],
  "schemaVersion": 1
}
```

**Usuario-proveedor** `…/kiArenaUserProviders/Xk3fG9qLm2TzR8wYb1Vc:twitch:141981764`
```json
{
  "id": "Xk3fG9qLm2TzR8wYb1Vc:twitch:141981764",
  "reference": "environments/qa/kiArenaUserProviders/Xk3fG9qLm2TzR8wYb1Vc:twitch:141981764",
  "isActive": true,
  "userRef": "environments/qa/kiArenaUsers/Xk3fG9qLm2TzR8wYb1Vc",
  "providerRef": "environments/qa/kiArenaProviders/twitch:141981764",
  "providerTypeRef": "environments/qa/kiArenaProviderTypes/twitch",
  "isPrimary": false,
  "linkedAt": "2026-10-24T19:00:00Z"
}
```

**Eventos** (vinculación de Pedro y conflicto de otro usuario con la misma cuenta)
```json
{ "id": "8sTq2LmN0pVwX4yZ6aBc", "reference": "environments/qa/kiArenaUserProviderEvents/8sTq2LmN0pVwX4yZ6aBc",
  "isActive": true, "action": "link",
  "providerRef": "environments/qa/kiArenaProviders/twitch:141981764",
  "userRef": "environments/qa/kiArenaUsers/Xk3fG9qLm2TzR8wYb1Vc", "createdAt": "2026-10-24T19:00:00Z" }
```
```json
{ "id": "R1aZ9bY8cX7dW6eV5fU4", "reference": "environments/qa/kiArenaUserProviderEvents/R1aZ9bY8cX7dW6eV5fU4",
  "isActive": true, "action": "conflict",
  "providerRef": "environments/qa/kiArenaProviders/twitch:141981764",
  "userRef": "environments/qa/kiArenaUsers/Ab12Cd34Ef56Gh78Ij90",
  "otherUserRef": "environments/qa/kiArenaUsers/Xk3fG9qLm2TzR8wYb1Vc", "createdAt": "2026-10-26T10:05:00Z" }
```

Si Pedro desvincula Kick, su usuario-proveedor queda `isActive: false` con `unlinkedAt`, sale de `userProviderRefs` y `providerTypeRefs`, y se crea un evento `unlink`; el proveedor `kick:4567890` sigue guardado. La misma persona en `dev` o `prd` tendría documentos totalmente separados.

## Reglas de vinculación, tokens y privacidad

- Nunca unir cuentas por email. Vincular un segundo proveedor solo con sesión iniciada.
- Tokens de acceso/refresh fuera de estas colecciones; si el bot los necesita más adelante, cifrados en una colección solo de servidor o en Secret Manager.
- Escritura solo desde servidor; reglas: el usuario lee su propio `kiArenaUsers/{uid}` y nada más.
- Revocar en el proveedor = el próximo login falla; no se borra nada.
- Datos mínimos: solo los scopes de la tabla.

## Dependencias con otras specs

- `persistencia-firestore`: el adaptador debe leer/escribir `referenceValue` y arrays de referencias; módulo `APP_ENV`.
- `seguridad-y-autoridad`: reglas Firestore y Auth de operador (`roles: operator` protege `/bot` y `/settings`).
- `integracion-twitch` / `integracion-tiktok`: el `providerUserId` es el mismo ID que llega por chat/regalos.
