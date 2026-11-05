# Requisitos — Autenticación de usuarios y cuentas vinculadas · EN DESARROLLO

> **Estado (2026-10-22):** modelo aprobado por Pedro; implementación en curso en el hilo «Login con proveedores y usuario», en una rama propia desde `feature/migrationclaud`. Fuente: documento [Datos de usuario por proveedor de login](https://claude.ai/artifact/Py4V8nWMmAZAqCqtNB2dC6). Aplican las reglas de `.kiro/steering/reglas-datos.md` (campos base opcionales, borrado suave, referencias completas por entorno, `APP_ENV` = `dev|qa|prd`).

## Introducción

Ki Arena tendrá usuarios con sesión. Una persona se registra con email y contraseña o con un proveedor (Google, Apple, TikTok, Twitch, Kick) y después puede vincular más cuentas desde Configuración. Entre con la cuenta que entre, siempre llega al mismo usuario. El modelo tiene cuatro colecciones: tipos de proveedor → proveedores → usuarios-proveedores (tabla intermedia) ← usuarios.

## Requisitos

### HU-AUT-01 — Pantalla de login y registro con estilo Dragon Ball Z
**Historia de usuario:** Como jugador, quiero una pantalla de entrada con la estética de Ki Arena, para registrarme o entrar con el método que prefiera.

**Criterios de aceptación**
1. El sistema DEBE ofrecer registro e inicio de sesión con email y contraseña (Firebase Auth).
2. El sistema DEBE mostrar un botón por cada tipo de proveedor con `isActive=true` y `allowLogin=true`, en el orden de `order`.
3. La pantalla DEBE seguir la estética DBZ del juego (aura, colores de ki, tipografía de la arena) y funcionar en móvil y escritorio.
4. SI la autenticación falla o se cancela, ENTONCES el sistema DEBE mostrar un mensaje claro sin perder lo escrito.
5. La pantalla NO DEBE mostrarse dentro de la vista `/` transmitida.

### HU-AUT-02 — Entrar con Google o Apple (Firebase Auth nativo)
**Criterios de aceptación**
1. CUANDO el usuario entra con Google o Apple, el sistema DEBE usar el proveedor nativo de Firebase Auth.
2. El sistema DEBE usar `sub` como `providerUserId`, nunca el email.
3. DONDE el proveedor es Apple, el sistema DEBE guardar el nombre en la primera autorización, porque no vuelve a llegar.

### HU-AUT-03 — Entrar con TikTok, Twitch o Kick (custom token)
**Criterios de aceptación**
1. CUANDO el usuario entra con TikTok, Twitch o Kick, una función de servidor DEBE hacer el OAuth, validar al usuario con la plataforma y emitir un custom token de Firebase.
2. El `providerUserId` DEBE ser `open_id` (TikTok, guardando también `union_id`), `sub` (Twitch) o `user_id` (Kick).
3. Kick DEBE usar OAuth 2.1 con PKCE (S256) y obtener `user_id` con `GET /public/v1/users`.
4. Client secrets y tokens NO DEBEN estar en el navegador, en Firestore legible ni en Git.

### HU-AUT-04 — Login resuelve siempre al mismo usuario
**Criterios de aceptación**
1. CUANDO llega un login, el servidor DEBE crear o actualizar `kiArenaProviders/{providerTypeId}:{providerUserId}` con los datos recibidos.
2. El servidor DEBE buscar en `kiArenaUserProviders` un registro activo con ese `providerRef`; SI existe, ENTONCES DEBE iniciar sesión como su `userRef` y actualizar `lastLoginAt`.
3. SI no existe, ENTONCES el servidor DEBE crear, en una sola transacción, el usuario y el registro usuario-proveedor con `isPrimary=true`, y un evento `link`.
4. El sistema NO DEBE unir cuentas automáticamente por email.

### HU-AUT-05 — Vincular otra cuenta desde Configuración
**Historia de usuario:** Como usuario registrado con Google, quiero vincular mi TikTok, Twitch y Kick, para entrar con cualquiera.

**Criterios de aceptación**
1. Configuración › Cuentas vinculadas DEBE listar los tipos con `allowLink=true` e `isActive=true` y marcar los ya vinculados.
2. CUANDO el usuario pulsa «Conectar», el servidor DEBE generar un `state` ligado a su uid (anti-CSRF) y validarlo a la vuelta.
3. SI la cuenta no está vinculada, ENTONCES DEBE crear `{userId}:{providerId}` o reactivar ese documento si estaba desvinculado (evento `link` o `relink`).
4. SI la cuenta ya es del mismo usuario, ENTONCES no DEBE hacer nada.
5. SI la cuenta está activa en otro usuario, ENTONCES NO DEBE moverla; DEBE mostrar «Esta cuenta de <Plataforma> ya está vinculada a otro usuario de Ki Arena» y registrar un evento `conflict`.
6. La comprobación y la creación DEBEN ocurrir en una transacción del servidor, para que una misma cuenta externa nunca quede activa en dos usuarios.
7. El usuario DEBE actualizar `userProviderRefs` y `providerTypeRefs`.

### HU-AUT-06 — Desvincular sin quedarse fuera
**Criterios de aceptación**
1. SI es el último registro activo del usuario, ENTONCES el sistema NO DEBE permitir desvincularlo.
2. CUANDO se desvincula, el registro DEBE quedar `isActive=false` con `unlinkedAt`, salir de `userProviderRefs` y registrar un evento `unlink`; nada se borra.
3. SI era el principal, ENTONCES el registro activo más antiguo DEBE pasar a `isPrimary=true`.
4. DONDE es Google o Apple, el sistema DEBE desvincularlo también en Firebase Auth.

### HU-AUT-07 — Modelo de datos por entorno
**Criterios de aceptación**
1. Las colecciones DEBEN vivir en `environments/{APP_ENV}/`: `kiArenaProviderTypes`, `kiArenaProviders`, `kiArenaUserProviders`, `kiArenaUsers`, `kiArenaUserProviderEvents`.
2. Toda relación (`providerTypeRef`, `providerRef`, `userRef`, `userProviderRefs`, `primaryUserProviderRef`, `providerTypeRefs`, `playerRef`, `otherUserRef`) DEBE ser una referencia Firestore completa del mismo entorno.
3. `id`, `reference` e `isActive` DEBEN ser opcionales al leer y llenarse en toda escritura nueva; los campos de perfil de `kiArenaProviders` son todos opcionales.
4. Agregar una plataforma DEBE requerir solo un documento nuevo en `kiArenaProviderTypes` más su función de servidor si usa custom token.
5. El email/contraseña DEBE registrarse como tipo de proveedor `password` (`authMethod: firebase`).

### HU-AUT-08 — Seguridad y privacidad
**Criterios de aceptación**
1. Las colecciones de autenticación DEBEN escribirse solo desde el servidor (Cloud Function / Admin SDK).
2. Las reglas DEBEN permitir al usuario leer solo su propio `kiArenaUsers/{uid}` y sus vínculos.
3. El sistema DEBE pedir solo los scopes mínimos de la tabla de proveedores.
4. Los tokens de acceso/refresh NO DEBEN guardarse en estas colecciones.

### HU-AUT-09 — Enlace con el jugador de la arena
**Criterios de aceptación**
1. (Pedro, 2026-10-24) El usuario PUEDE tener varios personajes: `playerRefs[]` (referencias a `kiArenaPlayers`) y `primaryPlayerRef` (el que entra por defecto); reemplazan a `playerRef`. Cada personaje guarda `userRef` a su usuario. `kiArenaPlayers` es la tabla intermedia usuario × tipo de personaje (HU-FS-11).
2. El criterio para enlazar un jugador existente (automático por ID de Twitch o manual) queda como pregunta abierta.

## Preguntas abiertas (del documento)
- uid de Firebase para TikTok/Twitch/Kick: `{provider}:{id}` (propuesto) o aleatorio.
- ¿Pedir `user:read:email` en Twitch?
- ¿TikTok y Apple entran ya? (revisión de app TikTok; Apple requiere cuenta de pago).
- Enlace de jugadores existentes con su usuario.
- ¿Una sola cuenta por proveedor por usuario? (recomendado)
- ¿Fusionar usuarios en conflicto en una HU futura?

### HU-AUT-10 — Roles de usuario (Pedro, 2026-11-05)
**Historia de usuario:** Como dueño del juego, quiero que cada usuario tenga uno o varios roles de un catálogo, para decidir qué puede hacer cada uno sin tocar código.

**Criterios de aceptación**
1. Los roles DEBEN vivir en el catálogo `kiArenaRoles/{code}` con `code`, `name`, `description`, `permissions[]` y `level`, más `id`, `reference` e `isActive`.
2. Los roles iniciales DEBEN ser `player` (Jugador), `streamer`, `partner`, `seller` (Vendedor), `admin` (Administrador) y `superadmin` (Superadministrador).
3. La relación usuario × rol DEBE guardarse en la tabla intermedia `kiArenaUserRoles/{uid}:{roleCode}` con `userRef`, `roleRef`, `grantedByRef`, `grantedAt`, `revokedAt`; quitar un rol = `isActive=false`, nunca borrar.
4. CUANDO se crea un usuario, el sistema DEBE darle `player` (fila en `kiArenaUserRoles` y `roleRefs` en el usuario). Un rol revocado NO DEBE volver a darse solo.
5. `kiArenaUsers.roleRefs[]` DEBE copiar los roles activos para leerlos rápido; `roles` (texto) se conserva como legado.
6. Un usuario solo PUEDE dar roles de `level` menor al suyo; `superadmin` puede dar cualquiera (pendiente: pantalla y reglas).

### HU-AUT-11 — Panel de superadministrador e invitaciones de rol (Pedro, 2026-11-05)
**Historia de usuario:** Como superadministrador, quiero un panel donde vea usuarios, players y todas las tablas, cambie roles y edite los catálogos (razas, poderes, …) agregando campos, para operar el juego sin tocar código ni la consola de Firebase.

**Criterios de aceptación**
1. `/admin` y «Sincronizar ambientes» DEBEN mostrarse solo a un `superadmin` activo del entorno; `/settings` a quien tenga `settings.edit` (superadmin, admin). Los demás ven «Sin permiso» y un enlace a su cuenta.
2. El panel DEBE listar usuarios con sus roles activos y permitir dar y quitar roles: fila `kiArenaUserRoles/{uid}:{rol}` con `grantedByRef`/`grantedAt` o `isActive=false` + `revokedAt`/`revokedByRef`, y copiar `roleRefs` y `roles` en el usuario. Nadie PUEDE quitarse `superadmin` a sí mismo ni desactivarse.
3. Un superadmin PUEDE dar un rol por email a quien aún no ha entrado: `kiArenaRoleInvites/{email}:{rol}` (`email`, `roleRef`, `createdByRef`, `usedAt`, `usedByRef`, `isActive`). Al entrar con ese email VERIFICADO el servidor asigna el rol y marca la invitación como usada (`isActive=false`).
4. El panel DEBE ofrecer CRUD sobre todas las tablas del entorno: crear (con `id`, `reference`, `isActive`, `createdAt` automáticos), editar con tipos (texto, número, sí/no, referencia completa, fecha, mapa, lista), agregar un campo a un registro o a todos los que no lo tienen, y desactivar/reactivar. NUNCA DEBE borrar documentos.
5. En `prd`, cada escritura del panel DEBE pedir teclear «prd».
6. La puerta por rol es de la interfaz; la protección de los datos necesita reglas de Firestore por rol (HU-AUT-08, tarea 9).

### HU-AUT-12 — Login sin Cloud Functions desplegadas (2026-11-05)
1. CUANDO `authApi` responde 404 (no desplegada) o no responde, la app de escritorio DEBE correr el mismo `createAuthApi` en local con Firestore por REST y el ID token verificado en Google. Email y Google DEBEN funcionar; Twitch, Kick y TikTok DEBEN explicar que necesitan la función.
