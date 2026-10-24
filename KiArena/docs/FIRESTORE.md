# Firestore: datos, entornos y seguridad

## Proyecto y cliente

- Proyecto Firebase configurado: `sayayin-c0dfe`.
- Base Firestore: `(default)`.
- Firebase Hosting entrega los recursos estáticos desde `public/`.
- `public/src/config/firebase.js` acepta `?env=dev`, `?env=qa` o `?env=prod`; si falta o no es válido, elige `dev`.
- `public/src/services/firebase/arena-cloud.js` usa el endpoint REST `firestore.googleapis.com/v1` con la API key web del cliente.

La API key cliente no es una contraseña. Las reglas Firestore son el control de acceso. No copiar claves OAuth, tokens de Twitch ni secretos de backend a `public/`.

## Espacios y rutas

Los tres entornos actuales son prefijos lógicos dentro del mismo proyecto:

| Entorno | Perfiles | Mensajes | Eventos |
|---|---|---|---|
| `dev` | `environments/dev/kiArenaPlayers/{usernameKey}` | `environments/dev/kiArenaMessages/{auto-id}` | `environments/dev/kiArenaEvents/{auto-id}` |
| `qa` | `environments/qa/kiArenaPlayers/{usernameKey}` | `environments/qa/kiArenaMessages/{auto-id}` | `environments/qa/kiArenaEvents/{auto-id}` |
| `prod` | `environments/prod/kiArenaPlayers/{usernameKey}` | `environments/prod/kiArenaMessages/{auto-id}` | `environments/prod/kiArenaEvents/{auto-id}` |

La configuración del juego se guarda en `environments/{dev|qa|prod}/kiArenaSettings/gameplay`. El documento contiene `settingsJson` (JSON serializado con versión, multiplicadores de atributos, curvas de daño por nivel y elegibilidad de personajes), `environment` y `updatedAt`. La pantalla lee y escribe únicamente el documento del entorno seleccionado. Si nunca se ha guardado Settings, los valores predeterminados del código se usan como fallback.

Esto evita mezclar documentos por convención; **no** aísla permisos, cuotas, facturación o recursos. La configuración `.firebaserc` todavía tiene un alias `default` apuntando a `sayayin-c0dfe`. Antes de producción real, asignar proyectos por entorno y reglas propias.

## Documento de perfil

`usernameKey` es el `trim().toLowerCase()` del nombre visible y también se usa como ID de documento. El jugador debe suministrar de 3 a 24 caracteres de `[A-Za-z0-9_.-]`.

| Campo | Tipo | Uso |
|---|---|---|
| `username` | string | Nombre presentado en chat y roster. |
| `usernameKey` | string | Clave normalizada y única. |
| `race` | number | Índice estable: 0 Saiyajin, 1 Namekuseijin, 2 Humano, 3 Freezer. |
| `level` | number | Nivel entero limitado entre 1 y 100. |
| `xp` | number | XP dentro del nivel actual; se pone en cero al nivel 100. |
| `kills` | number | Bajas atribuidas al usuario. |
| `deaths` | number | Veces que cae. |
| `alive` | boolean | Si el perfil debe volver activo al cargar la arena. |
| `hp` | number | Vida actual. La vida máxima y las cuatro estadísticas se derivan de nivel. |
| `schemaVersion` | number | Actualmente `2`. |
| `updatedAt` | string | Marca ISO generada por el navegador al guardar. |

El adaptador normaliza límites al guardar. No usa transacciones: dos sesiones simultáneas podrían guardar una progresión una sobre otra. XP, bajas y ataques se calculan en el cliente actual y no son autoritativos.

## Mensajes y eventos

- Mensajes guardan `username`, texto truncado a 120 caracteres, el comando reconocido si el texto completo es `E/K/M/V` y `createdAt` ISO.
- Eventos de combate incluyen `type` y los datos sencillos del evento; una baja usa el tipo `knockout` con `victim` y `killer`.
- La lista de mensajes solicita los últimos 50 por fecha descendente y los muestra en orden ascendente.
- La app consulta mensajes cada 2.5 s y vuelve a cargar roster cada 8 s; no usa listeners Firestore en tiempo real.

## Usuarios y cuentas vinculadas (login)

Escritas solo por la función `authApi` (Admin SDK). Todo bajo `environments/{APP_ENV}/` con `APP_ENV` en `dev`, `qa` o `prd`. Cada documento lleva `id`, `reference` (su propia referencia completa) e `isActive`; nada se borra.

| Colección | ID | Contenido |
| --- | --- | --- |
| `kiArenaProviderTypes` | `password`, `google`, `apple`, `twitch`, `kick`, `tiktok` | Catálogo y configuración pública de cada plataforma: `authMethod`, `scopes`, `clientId`, `redirectUri`, `allowLogin`, `allowLink`. Los secretos van en Secret Manager. |
| `kiArenaProviders` | `{tipo}:{idExterno}` | Datos de la cuenta externa (todos opcionales) y `providerTypeRef`. |
| `kiArenaUsers` | uid de Firebase Auth | Usuario: nombre, avatar, email, `userProviderRefs`, `primaryUserProviderRef`, `providerTypeRefs`, `roles`. |
| `kiArenaUserProviders` | `{uid}:{providerId}` | Tabla intermedia: `userRef`, `providerRef`, `providerTypeRef`, `isPrimary`, `linkedAt`, `unlinkedAt`. |
| `kiArenaUserProviderEvents` | auto | Historial `link`, `unlink`, `relink`, `conflict`. |
| `kiArenaOAuthStates` | `{env}.{aleatorio}` | `state` anti-CSRF de un solo uso (10 min) con el `code_verifier` de PKCE; se marca `isActive=false` al usarse. |

Las relaciones (`…Ref`) son `referenceValue` con la ruta completa `projects/sayayin-c0dfe/databases/(default)/documents/environments/{APP_ENV}/…`. `arena-cloud.js` ya las lee como ruta `environments/…`.

Reglas: una cuenta externa solo puede estar activa en un usuario (la transacción revisa `kiArenaUserProviders` por `providerRef` antes de vincular). No se une por email. No se puede desvincular la última cuenta. Los tokens OAuth no se guardan. Las reglas de seguridad de Firestore para estas colecciones (escritura solo servidor, lectura del propio usuario) siguen pendientes.

Firebase Authentication guarda la sesión del navegador en IndexedDB. Es la sesión de login, no progreso de juego.

## Razas, personajes y poderes (2026-10-24)

Todo bajo `environments/{env}/`. Valores de fábrica en `public/src/config/game-catalog.js`; lo guardado en Firestore gana campo por campo.

| Colección | Id | Relaciones | Qué guarda |
|---|---|---|---|
| `kiArenaRaces` | `saiyajin`, `namekuseijin`, `terricola`, `freezer` | — | `stats` (ki, physicalAttack, physicalDefense, kiDefense) y `utility` (Zenkai, Regeneración, Ingenio, Transformación) |
| `kiArenaPlayerTypes` | `goku`, `piccolo`, `gohan`, `freezer` | `raceRef` | Personaje, `legacyRace` (0–3), `isEligible` |
| `kiArenaPowers` | `{raza}_{poder}` (42) | `raceRef` | Comando, nivel, enfriamiento, `multipliers.*.{start,end}`, `utility.params.hitboxMode` |
| `kiArenaPlayerPowers` | `{jugador}:{poder}` | `playerRef`, `powerRef` | Poderes de cada personaje: `source`, `timesUsed`, `kills` |
| `kiArenaPlayers` | `usernameKey` | `playerTypeRef`, `userRef` (opcional) | Progreso; `race` se conserva como legado; `utilityState` |
| `kiArenaEvents` | auto | `killerRef`, `victimRef`, `powerRef` | `power` (`K`, `M`, `V` o `physical`), `xpGained` |

Migración y siembra (sin borrar, mismos niveles): `cd functions && npm run migrate:characters -- dev` (simulación) y luego con `--apply`. `prd`/`prod` piden `--confirm-prd`. `npm run emulators` lo hace solo en dev y qa del emulador.

## Datos locales y memoria

No guardar progreso en `localStorage` ni `sessionStorage`. La velocidad, posición, partículas, estados de animación y proyectiles viven en memoria de la pestaña. Firestore mantiene identidad/progreso y registros de chat/eventos.

## Seguridad y tareas pendientes

El documento histórico `FIREBASE.md` indica que las reglas existentes permiten lectura/escritura públicas; comprobarlas en Firebase antes de abrir el juego ampliamente. Añadir Authentication y reglas por usuario/canal; mover decisiones de XP/KO a una función confiable para evitar trampas. Los prefijos de entorno no son una frontera de seguridad. Nunca probar la interfaz con comandos que escriban perfiles reales sin una instrucción explícita; usar `qa` o Emulator Suite.
