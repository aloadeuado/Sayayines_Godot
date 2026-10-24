# Registro de instrucciones y cambios de Ki Arena

Este registro es acumulativo. Cada nueva instrucción del usuario sobre juego, arquitectura, datos, entornos, Twitch, publicación o seguridad recibe una entrada fechada. Las propuestas no implementadas se anotan como pendientes; las preguntas informativas no cambian requisitos y se registran solo si aportan una decisión al proyecto.

## 2026-10-24 — diagrama completo, arreglos y datos mínimos en dev

- **Solicitud:** Pedro pidió el diagrama completo con los arreglos, ajustar las HUs, arreglar el código que haga falta y crear los datos que el código necesita para no fallar.
- **Código:** `buildCatalog` toma `engine`/`status` del código y no del documento (un poder sembrado como pendiente se activa cuando se publique su mecánica). La migración crea `kiArenaSettings/gameplay` con valores de fábrica si falta. `seed-provider-types` acepta `--rest`. 26 pruebas.
- **Datos en dev:** `kiArenaSettings/gameplay` (no existía; la arena y settings daban 404) y `kiArenaProviderTypes` (6, sin clientId). Segunda pasada: 0 cambios. Arena, bot y settings cargan contra dev sin errores; flujo completo probado en el emulador.
- **Specs:** HU-FS-13 (datos mínimos por entorno), HU-POD-09.5. Diagrama ER completo en el artifact del modelo de personajes.
- **Rama/commit:** rama `claude/project-thread-osowq6`.

## 2026-10-24 — tamaño en X, poderes que faltaban y todo sembrado en dev

- **Solicitud:** Pedro pidió que el poder crezca también en el eje X (no en los rayos, que tienen izquierda y derecha; sí en la Genkidama o la explosión de Vegeta), crear los poderes que faltaban y dejar todo en dev.
- **Implementación:** `baseSize`/`multipliers.size` pasan a `baseSizeY`/`multipliers.sizeY`; nuevo `baseSizeX`/`multipliers.sizeX` en áreas, explosiones, físicos y control (32 de 57). `powerSizeAt(power, N, 'x'|'y')`; los documentos viejos siguen leyéndose. 12 poderes nuevos (Explosión Final, Burning Attack, Súper Saiyajin, Teletransportación, Granada de Luz, Makosen, Rayo de los Ojos, Rayo Dodon, Sokidan, Multiforma, Zanzoken ×4, Nova Strike): 57 en total, pendientes de mecánica salvo los 3 motores existentes. Settings muestra el eje X solo donde aplica.
- **Datos:** `--rest` en la migración (API REST con la apiKey web). Respaldo previo en `ki-arena/backups/dev-2026-10-24/`. Aplicado en `environments/dev`: 4 razas, 4 tipos, 57 poderes, 15 jugadores (mismos niveles y XP), 56 filas de poderes por jugador, 2154 mensajes y 576 eventos con campos base y referencias. Segunda pasada: 0 cambios. qa y prod sin tocar.
- **Rama/commit:** rama `claude/project-thread-osowq6`.

## 2026-10-24 — tamaño de los poderes en el eje Y

- **Solicitud:** Pedro pidió una variable para que el poder crezca en el eje Y con el nivel, como multiplicador.
- **Implementación:** `baseSize` (px) y `multipliers.size {start, end}` en cada poder; grosor(N) = `baseSize × size(N)` (`powerSizeAt`), usado por el dibujo y la hitbox. Reemplaza `width` (que sigue leyéndose en documentos viejos). Editable en settings. La migración agrega `size` a poderes ya sembrados sin tocar sus otros multiplicadores. 23 pruebas; probado en el emulador.
- **Rama/commit:** rama `claude/project-thread-osowq6`.

## 2026-10-24 — implementar razas, personajes y poderes

- **Solicitud:** Pedro pidió crear los registros de poderes, ajustar las HUs, corregir el juego para que use los modelos nuevos y migrar usuarios y jugadores existentes sin borrar nada y conservando los niveles.
- **Implementación:**
  - `public/src/config/game-catalog.js`: valores de fábrica de 4 razas, 4 tipos de personaje y 42 registros de poder (28 poderes por raza), mezcla con Firestore y reglas de desbloqueo y escalado.
  - `services/firebase/arena-cloud.js`: referencias completas (`referenceValue`), mapas y listas; `id`/`reference`/`isActive` en escrituras nuevas con `updateMask`; lecturas que ignoran `isActive === false`; catálogos y `kiArenaPlayerPowers`.
  - Arena: stats por raza, utilidades (Zenkai, Regeneración, Ingenio, Transformación), poderes desde el catálogo (nivel, enfriamiento, carga, ancho, 4 multiplicadores), hitbox `full` con daño por tick, filas de poderes por personaje con usos y derrotas, eventos con `killerRef`/`victimRef`/`powerRef`, perfiles desactivados no se recrean.
  - Bot: raza y personaje desde el catálogo, validación de comandos por catálogo, feed con el poder.
  - Settings: edición de razas, de cada poder por raza y de personajes elegibles (`kiArenaRaces`, `kiArenaPowers`, `kiArenaPlayerTypes`).
  - `functions/scripts/migrate-character-model.js` (`npm run migrate:characters`): siembra y migración por entorno, simulación por defecto, solo agrega campos; copia las curvas de settings a los poderes; no une usuarios con jugadores.
- **Verificación:** 22 pruebas de `node --test` (8 nuevas). En el emulador: datos con el esquema viejo migrados sin cambiar niveles; arena, bot y settings sin errores; bloqueos por raza/nivel/pendiente; jugador nuevo con `playerTypeRef`; usos de poderes y eventos con referencias; Zenkai al morir; guardado de settings. Nada se escribió en Firebase real.
- **Pendiente de Pedro:** correr la migración en dev, qa y prod/prd con credenciales; mecánicas de los 25 poderes pendientes; enlace usuario ↔ jugador.
- **Rama/commit:** rama `claude/project-thread-osowq6`.

## 2026-10-24 — catálogo de poderes por raza y poderes por personaje · PROPUESTA

- **Solicitud:** Pedro pidió que cada poder referencie una raza, con multiplicadores de ki, daño físico, defensa de ki y defensa física, nombre, descripción y una utilidad de daño persistente (hitbox solo del frente o de toda la onda expansiva). Además, relación muchos a muchos entre personajes y poderes.
- **Diseño:** `kiArenaPowers/{raceCode}_{powerCode}` (HU-POD-09, utilidad `persistentDamage` con `hitboxMode` `front`|`full` en HU-POD-10) y tabla intermedia `kiArenaPlayerPowers/{playerId}:{powerId}` (HU-POD-11). Tablas en `poderes-ki/design.md`, tareas 3.1–3.6. Sin cambios de código.
- **Rama/commit:** rama `claude/project-thread-osowq6`.

## 2026-10-24 — formato para mostrar modelos

- **Solicitud:** Pedro pidió que todo objeto o modelo se le muestre siempre como tabla de campos (tipo, obligatorio, descripción), con valores y relaciones.
- **Implementación:** sección 4 de la skill `reglas-desarrollo`.
- **Rama/commit:** rama `claude/project-thread-osowq6`.

## 2026-10-24 — HUs del modelo de personajes, eventos y poderes

- **Solicitud:** Pedro pidió dejar categorizado en las HUs de cada spec lo conversado sobre rutas, razas, tipos de personaje, personajes de usuario, eventos y poderes.
- **HUs nuevas o cambiadas:** HU-FS-01.7 (estructura `environments/{APP_ENV}`), HU-FS-09 razas, HU-FS-10 tipos de personaje, HU-FS-11 personajes de usuario (tabla intermedia), HU-FS-12 eventos; HU-RPG-06 características por raza, HU-RPG-07 utilidad por raza; HU-ENT-07 crear personaje desde el catálogo; HU-AUT-09.1 `playerRefs`/`primaryPlayerRef`; HU-BOT-07 feed con referencias; HU-SET-05 editar razas y tipos; HU-POD-08 modelo actual de poderes (más tablas en `poderes-ki/design.md`). Tareas en los `tasks.md` correspondientes. Sin cambios de código.
- **Rama/commit:** rama `claude/project-thread-osowq6`.

## 2026-10-24 — catálogo de razas (`kiArenaRaces`) con stats y utilidad · PROPUESTA

- **Solicitud:** Pedro pidió separar la raza en su propia colección, con características ki, daño físico, defensa física y defensa de ki, más una variable «utilidad» específica y editable por raza.
- **Diseño:** `environments/{APP_ENV}/kiArenaRaces/{code}` con `stats` (multiplicadores) y `utility` (`code`, `name`, `description`, `params`). Utilidades propuestas: Saiyajin Zenkai, Namekuseijin Regeneración, Terrícola Ingenio, Freezer Transformación. `kiArenaPlayerTypes.raceRef` reemplaza `raceName`; `kiArenaPlayers.utilityState` guarda lo acumulado. Tarea 3.12. Sin cambios de código.
- **Rama/commit:** rama `claude/project-thread-osowq6`.

## 2026-10-24 — catálogo de tipos de personaje (`kiArenaPlayerTypes`) · PROPUESTA

- **Solicitud:** Pedro pidió una colección de tipos de personaje (Saiyajin, Namekuseijin…) y que `kiArenaPlayers` la referencie.
- **Diseño:** `environments/{APP_ENV}/kiArenaPlayerTypes/{code}` (goku, piccolo, gohan, freezer) y `playerTypeRef` en `kiArenaPlayers`; `race` queda como legado de lectura. Documentado en `.kiro/specs/persistencia-firestore/design.md`, `reglas-datos.md` y la tarea 3.11. Sin cambios de código.
- **Rama/commit:** rama `claude/project-thread-osowq6`.

## 2026-10-24 — estructura de rutas por entorno en Firestore

- **Solicitud:** Pedro aclaró que el entorno lo define la ruta: colección raíz `environments`, un documento por entorno (`dev`, `qa`, `prd`) y dentro de cada uno todas las colecciones. Cada documento de entorno es una base de datos completa.
- **Implementación:** documentado en `.kiro/steering/reglas-datos.md` (árbol de rutas) y en las skills `reglas-desarrollo` y `persistencia-firestore`. Se sincronizó también la Regla 3 (ejecución y depuración por entorno), que faltaba en esta copia. Sin cambios de código: las rutas actuales ya siguen esta forma; queda pendiente pasar `prod` a `prd` en la web.
- **Alcance (Pedro):** aplica a todos los modelos. Cada `design.md` de `.kiro/specs/` y cada skill de `.claude/skills/` lleva al inicio la nota «Rutas Firestore (obligatorio)»; las rutas abreviadas (`kiArenaX/{id}`) cuelgan siempre de `environments/{APP_ENV}/`. HU-SET-04 pasa de `prod` a `prd`.
- **Rama/commit:** rama `claude/project-thread-osowq6`.

## 2026-10-22 — probar y depurar el login en local con Firebase Emulator Suite

- **Solicitud:** Pedro preguntó cómo probar y depurar sin desplegar.
- **Implementación:**
  - `KiArena/package.json` con `npm run emulators` (`scripts/emulators.js`): levanta Auth, Firestore, Functions y Hosting con el proyecto de prueba `demo-ki-arena`, crea secretos de prueba en `functions/.secret.local` (ignorado por Git) y siembra el catálogo en `dev` y `qa`. Bloque `emulators` en `firebase.json`.
  - `functions/src/fake-oauth.js`: en el emulador, Twitch, Kick y TikTok se reemplazan por una pantalla de permiso local; la API no contacta a ninguna plataforma.
  - `seed-provider-types.js --emulator`: siembra con `clientId` y `redirectUri` de prueba y todos los proveedores activos, solo con `FIRESTORE_EMULATOR_HOST`.
  - Web: `?emulators=1` en `localhost` conecta Auth al emulador y Firestore a `127.0.0.1:8080`, y lo indica en la pantalla.
  - Bug corregido: el usuario creado con email y contraseña no guardaba su email (solo se aceptaban emails verificados). Ahora se guarda con `emailVerified: false`; prueba nueva.
- **Verificación:** prueba de punta a punta con Playwright contra los emuladores, 15 de 15 pasos bien (registro, vincular Twitch y Kick, cancelar TikTok, entrar con Twitch y con email al mismo usuario, contraseña incorrecta, Google como otro usuario, conflicto, desvincular con borrado suave, cuenta desvinculada que ya no entra al usuario, última cuenta bloqueada, revincular sin duplicar). Datos revisados en el emulador de Firestore. 14 pruebas de `node --test`. Capturas en los archivos del proyecto (`ki-arena/login/emulador/`). En el contenedor el popup de Google no abre porque `apis.google.com` está bloqueado; se usó la misma credencial de Google del emulador. Nada se escribió en Firebase real.
- **Rama/commit:** rama `claude/project-thread-mzpblo`.

## 2026-10-22 — app de escritorio con Electron para probar el login

- **Solicitud:** Pedro pidió un ejecutable creado desde la copia local del proyecto. La app Electron del paquete de contexto no está en GitHub, así que se creó una nueva y mínima.
- **Implementación:** `desktop/` con `main.js` (ventana, menú Arena/Login/Bot/Settings, ventanas emergentes de Firebase Auth permitidas y enlaces externos al navegador), `server.js` (sirve `public/` en `localhost` con las rutas de Hosting y reenvía `/api/auth/**` a `authApi`) y `scripts/` para copiar la web y empaquetar con `@electron/packager` (Electron 33.4.11).
- **Builds:** macOS Apple Silicon, macOS Intel y Windows x64 sin firmar, en los archivos del proyecto (`ki-arena/builds/`). No se suben a Git.
- **Verificación:** `node --check`; el servidor local respondió 200 en `/`, `/login`, `/cuenta`, `/bot`, `/settings` y archivos estáticos, 404 en una ruta fuera de la carpeta y 502 controlado en `/api/auth` sin la función; el `app.asar` contiene la web. No se abrió la app en macOS ni Windows.
- **Pendiente:** firma y notarización; volver a la app después del login con Twitch, Kick o TikTok.
- **Rama/commit:** rama `claude/project-thread-mzpblo`.

## 2026-10-22 — login con email, Google, Apple, TikTok, Twitch y Kick, y cuentas vinculadas

- **Solicitud:** Pedro aprobó el modelo de datos de login y pidió empezar el desarrollo: pantalla con diseño Dragon Ball Z, usuario y contraseña con Firebase Auth además de los proveedores, y cuentas vinculadas a un mismo usuario. También pidió que las relaciones se guarden como referencias completas ligadas al entorno, y dejar lo acordado en specs.
- **Decisiones:** cuatro colecciones bajo `environments/{APP_ENV}/` (`kiArenaProviderTypes`, `kiArenaProviders`, `kiArenaUsers`, `kiArenaUserProviders`) más el historial `kiArenaUserProviderEvents` y los `state` OAuth `kiArenaOAuthStates`. Relaciones y `reference` como referencias completas de Firestore. Una cuenta externa solo puede estar activa en un usuario; no se une por email; la última cuenta no se desvincula; todo borrado es `isActive=false`. Email y contraseña usan como llave el uid de Firebase. Apple queda apagado (`allowLogin: false`) hasta tener la cuenta de Apple Developer.
- **Implementación:**
  - `functions/`: función `authApi` (`/api/auth/**`) con el modelo de cuentas en transacciones, sesión para email/Google/Apple, OAuth de servidor para Twitch, Kick (PKCE S256) y TikTok con custom token, vincular, desvincular (también en Firebase Auth) y script de siembra del catálogo en modo simulación.
  - `public/login/index.html`, `styles/login.css`, `src/app/login-app.js`, `src/services/firebase/auth-client.js`: pantalla `/login` y `/cuenta` con estética DBZ (Kame House, esfera de 4 estrellas, barra de ki), registro, recuperar contraseña, botones por proveedor y gestión de cuentas vinculadas.
  - `src/config/environment.js` y `public/env.js`: `APP_ENV` con `dev`, `qa`, `prd` para los módulos nuevos. Las vistas antiguas siguen con `?env=dev|qa|prod` hasta la migración `prod → prd`, que requiere aprobación.
  - `arena-cloud.js` lee `referenceValue`, arrays y mapas. `firebase.json` agrega las rutas `/login`, `/cuenta` y `/api/auth/**` y la configuración de `functions`. Enlace «Entrar / Mi cuenta» en la arena.
  - `.kiro/` y `.claude/skills/` copiados del hilo de arquitectura Kiro; tareas de `autenticacion-usuarios` marcadas.
- **Archivos:** `functions/**`, `firebase.json`, `public/login/index.html`, `public/styles/login.css`, `public/src/app/login-app.js`, `public/src/services/firebase/auth-client.js`, `public/src/config/environment.js`, `public/env.js`, `public/assets/providers/*.svg`, `public/index.html`, `public/src/services/firebase/arena-cloud.js`, `docs/PROJECT_SPEC.md`, `docs/FIRESTORE.md`, este registro.
- **Verificación:** `node --check` en todos los módulos nuevos y modificados; 13 pruebas de `node --test` pasan contra un Firestore en memoria (alta, mismo usuario por cualquier proveedor, conflicto, borrado suave, cambio de principal, última cuenta, relink, PKCE y `state` de un solo uso en Kick, `returnTo` externo ignorado); la función carga con las dependencias reales; capturas de `/login` y `/cuenta` en 390 px y 1280 px con Firebase simulado; `git diff --check`. No se escribió en Firestore real, no se desplegó Hosting ni Functions y no se abrió el navegador de Pedro.
- **Pendiente:** activar métodos en Firebase Authentication, apps OAuth y secretos por entorno, sembrar el catálogo en `dev` (con aprobación), plan Blaze, reglas de Firestore para estas colecciones, enlace usuario ↔ jugador, nombre de Apple en web.
- **Rama/commit:** rama `claude/project-thread-mzpblo` creada desde `feature/migrationclaud`.

## 2026-10-02 — hacer observable la secuencia de golpes cuerpo a cuerpo

- **Solicitud:** revisar la iteración de duelo al observar que el nivel 9 no quitó HP al nivel 14, aunque el nivel 14 sí dañó al nivel 9.
- **Hallazgo:** el duelo recorre cuatro turnos en orden atacante A, B, A, B. Una acción no se omite por iteración regular: a cada turno le corresponde una sola tirada de evasión y, si conecta, se aplica daño. Antes, los golpes conectados no se registraban y solo el 35% de las esquivas se anunciaban, haciendo imposible distinguir un paso perdido de una esquiva.
- **Implementación:** se conserva la secuencia y el balance. Ahora el registro de combate indica cada esquiva y cada golpe físico conectado, con atacante, objetivo, HP descontado y HP restante.
- **Archivos:** `public/src/game/arena.js`, este registro.
- **Verificación:** `node --check` pasó; la comprobación estática confirmó el orden A/B/A/B y el registro de impactos; `git diff --check` pasó. El cálculo base de nivel 9 contra defensa de nivel 14 da 12.465–15.465 de daño al conectar. No se abrió el navegador ni se modificó Firebase.
- **Rama/commit:** rama `separate`, sin commit.

## 2026-10-02 — corregir inicialización de la arena raíz

- **Solicitud:** reparar la arena vacía; la captura mostraba `setSettingsStatus is not defined` al cargar desde Firebase.
- **Causa:** la arena raíz intentaba actualizar el estado de Settings aunque el formulario de ajustes ya está en la ruta `/settings` y no existe en `/`.
- **Implementación:** la carga de configuración en arena ya no llama a la función del formulario separado; ante fallo de lectura usa los ajustes iniciales y continúa el arranque.
- **Archivos:** `public/src/game/arena.js`, este registro.
- **Verificación:** `node --check` pasó para `arena.js`; búsqueda confirmó que `loadGameSettings` ya no referencia `setSettingsStatus`; `git diff --check` pasó. No se abrió el navegador del usuario ni se modificó/desplegó Firebase.
- **Rama/commit:** rama `separate`, sin commit.

## 2026-10-02 — desbloqueo por nivel para Makankosappo y Kamehameha

- **Solicitud:** impedir que `Freezer3` en nivel 6 use Makankosappo y definir claramente los bloqueos de `M` y `K`.
- **Hallazgo:** el perfil Firestore `Freezer3` tiene `race: 0` (Saiyajin), `level: 6`; antes los requisitos 10/20 solo aplicaban a raza Freezer. El nombre de usuario no determina su raza.
- **Implementación:** `M` requiere nivel 10 y `K` nivel 20 para todas las razas; `V` sigue exclusivo de Freezer desde nivel 1. El requisito se valida en `/bot`, en el chat de la arena y nuevamente al ejecutar comandos. Los comandos bloqueados no se guardan ni se muestran como enviados. Settings muestra los requisitos junto a cada curva de daño; la inspección del luchador lista solo poderes desbloqueados.
- **Archivos:** `public/src/config/gameplay-settings.js`, `public/src/game/arena.js`, `public/src/app/bot-app.js`, `public/src/app/settings-app.js`, `docs/PROJECT_SPEC.md`, este registro.
- **Datos:** solo consulta de Firestore para comprobar la raza/nivel de `Freezer3`; no se modificó el perfil ni otros datos.
- **Verificación:** pasaron 10 aserciones de desbloqueo (niveles justo debajo y en el umbral, ambas razas), `node --check` en todos los módulos JS y `git diff --check`. No se abrió el navegador del usuario ni se desplegó Hosting.
- **Rama/commit:** rama `separate`, sin commit.

## 2026-10-02 — estado de conexión visible en /bot

- **Solicitud:** revisar el feedback mostrado en la captura del panel de Bot.
- **Hallazgo:** `#bot-status` quedaba permanentemente en «Conectando con Firestore…» aunque las cargas iniciales terminaban correctamente; el indicador global de Firebase era independiente.
- **Implementación:** al cargar correctamente chat, roster y métricas, la barra ahora confirma Firestore y el entorno seleccionado. Los comandos `K/M/V` de la captura corresponden a mensajes independientes guardados con segundos de diferencia, no a duplicaciones creadas por refrescar el chat.
- **Archivos:** `public/src/app/bot-app.js`, este registro.
- **Verificación:** comprobación de sintaxis y `git diff --check`; no se abrió el navegador ni se modificó Firestore.
- **Rama/commit:** rama `separate`, sin commit.

## 2026-10-02 — correcciones de chat, niveles y Settings en rama separate

- **Solicitud:** continuar en la rama `separate` y corregir las anotaciones: entradas E que se repiten, niveles reales de Firestore, caracteres dañados y el poder Makankosappo en Settings.
- **Implementación:** `joinPlayer` ya no vuelve a escribir `E`; rechaza duplicados antes de acceder a Firestore y bloquea entradas simultáneas del mismo nombre. La arena registra el mensaje una vez en el envío manual y marca su ID como visto en la pestaña actual. `/bot` resume mensajes históricos `E` del mismo usuario para evitar que el spam persistido vuelva a llenar el chat. La arena conserva `level` y `xp` leídos desde Firestore y dejó de guardar perfiles como efecto de la carga inicial. Makankosappo queda rotulado explícitamente para otras razas y para Freezer. Se repararon textos visibles y la animación del canvas comienza mientras carga Firebase, con timeout de red.
- **Datos:** no se hicieron escrituras manuales, estimaciones ni migraciones a Firestore; el juego seguirá mostrando el valor que exista en `level` de cada perfil.
- **Archivos:** `public/src/game/arena.js`, `public/src/services/firebase/arena-cloud.js`, `public/src/app/bot-app.js`, `public/src/app/settings-app.js`, `docs/PROJECT_SPEC.md`, este registro.
- **Verificación:** pasaron `node --check` en todos los módulos, `git diff --check`, aserciones de fórmulas en niveles 1, 2, 18 y 100, y comprobaciones estáticas de rutas/separación y conexión de niveles/poderes. Lectura GET de solo consulta confirmó que `Lordviril` en DEV tiene ahora `level: 6`, `xp: 32`; los otros perfiles consultados muestran los valores de Firestore, sin escritura o estimación. No se abrió el navegador del usuario ni se usó la arena DEV; sin despliegue a Firebase Hosting.
- **Rama/commit:** rama `separate`, todavía sin commit.

## 2026-10-02 — separación de vistas en rutas /, /settings y /bot en rama separate

- **Solicitud:** crear una nueva rama `separate`; hacer que la ventana del juego (la arena con los luchadores) esté en la raíz `/` para verse de inmediato al entrar a la URL; mover todos los ajustes a `/settings`; y ubicar en `/bot` el chat, el roster y las métricas.
- **Implementación:**
  - Se creó y activó la rama `separate`.
  - `public/index.html` (raíz `/`): presenta la ventana de la arena de forma inmediata y destacada, con visualización limpia ideal para stream, selector de entorno, leyenda y toggle de hitboxes, y enlaces de navegación rápida a `/bot` y `/settings`.
  - `public/settings/index.html` (`/settings`): interfaz dedicada a las fórmulas por nivel, multiplicadores de atributos, curvas de daño para Kamehameha, Makankosappo y Rayo Mortal, catálogo de poderes pendientes y filtro de razas/personajes elegibles.
  - `public/bot/index.html` (`/bot`): interfaz de control con panel de chat en vivo y atajos (`E`, `K`, `M`, `V`), roster interactivo de luchadores con selección de remitente, ingreso individual y botón 'Agregar todos', y panel de métricas (resumen global de luchadores/KOs, atributos derivados del luchador seleccionado y registro de combate en vivo).
  - `arena.js`: adaptado con comprobaciones de nulidad en el DOM para operar limpiamente en la raíz `/` sin errores de consola, y conectado para ejecutar remotamente los comandos (`E`, `K`, `M`, `V`) que lleguen a Firestore desde `/bot` o fuentes externas.
  - `arena-cloud.js`: se añadió `listEvents()` para consultar los eventos de combate (`kiArenaEvents`) en tiempo real desde `/bot`.
  - `firebase.json`: configurado con `cleanUrls: true` y rewrites para `/settings` y `/bot`.
- **Archivos:** `public/index.html`, `public/bot/index.html`, `public/settings/index.html`, `public/styles/arena.css`, `public/src/main.js`, `public/src/app/bot-app.js`, `public/src/game/arena.js`, `public/src/services/firebase/arena-cloud.js`, `firebase.json`, `docs/PROJECT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/CHANGELOG.md`, `README.md`.
- **Verificación:** comprobación de sintaxis ES module de todos los archivos (`node --check`), validación de rutas HTML y selectores DOM sin errores de nulidad. Sin escrituras destructivas en Firestore y sin despliegue a Firebase Hosting.
- **Rama/commit:** rama `separate`.

## 2026-10-02 — fórmulas por nivel y elegibilidad configurable

- **Solicitud:** expresar los atributos y poderes como fórmulas de nivel `N`; editar multiplicadores desde Settings; guardar la regla en la skill; habilitar/deshabilitar personajes elegibles.
- **Implementación:** Settings muestra los multiplicadores de sangre/HP, ataque de ki, ataque físico, defensa física y defensa de ki; permite editar curvas lineales de daño para Kamehameha, Makankosappo y Rayo Mortal, incluyendo perfiles genéricos y Freezer. El catálogo de técnicas aún no implementadas queda etiquetado como pendiente. La selección de personajes controla el sorteo de raza para nuevos perfiles; las razas/progresos persistidos existentes permanecen intactos. Settings se persiste en Firestore por entorno.
- **Trazabilidad:** la skill del proyecto ahora exige registrar fórmulas, daño, controles de poderes y elegibilidad cada vez que se añada una técnica o personaje.
- **Archivos:** `public/src/config/gameplay-settings.js`, `public/src/game/arena.js`, `public/src/services/firebase/arena-cloud.js`, `public/index.html`, `public/styles/arena.css`, `docs/PROJECT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/FIRESTORE.md`, `.agents/skills/ki-arena-project/SKILL.md`.
- **Verificación:** pasaron las comprobaciones de sintaxis ES module para los seis módulos, `git diff --check` y el cálculo de atributos en N=1, 2, 50 y 100, así como la interpolación N=1→100 de los multiplicadores Freezer. No se escribieron documentos reales de Firestore.
- **Rama/commit:** rama `Twitch`, commit `af962174869d3f93c04a373b02d2f76285aa03a5` (implementación); este registro se completa en el commit siguiente. Sin despliegue de Firebase Hosting.

## 2026-10-01 — especificación persistente y contexto descargable

- **Solicitud:** guardar skills y especificaciones con el contexto del proyecto; hacer que las futuras instrucciones se agreguen al registro; subirlo para que quien descargue el repositorio tenga el contexto técnico y funcional.
- **Documentación creada:** `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `FIRESTORE.md`, `TWITCH_INTEGRATION.md`, este registro, `AGENTS.md` y `.agents/skills/ki-arena-project/SKILL.md`; actualizar índice README.
- **Regla futura:** registrar cada instrucción del usuario relacionada con el proyecto y actualizar la especificación cuando cambie un hecho o requisito.
- **Verificación solicitada/realizada:** la publicación de la documentación corresponde a esta entrada; el historial Git proporciona el identificador del commit que la contiene.

## 2026-10-01 — separar la estructura del prototipo en rama Twitch

- **Solicitud:** aplicar la arquitectura de carpetas propuesta en la rama actual, subirla y probarla antes de reemplazar la estructura anterior.
- **Implementación:** Hosting usa `public/`; se separaron página, CSS, assets, arranque, módulo de arena, configuración Firebase y adaptador de Firestore; `/ki-arena.html` redirige conservando parámetros. La integración Twitch se documentó como límite pendiente; no se conectaron credenciales.
- **Verificación:** sintaxis de cinco módulos ES; respuestas HTTP de página, CSS, JS y cinco sprites; navegador en `?env=qa` informó conexión Firebase; ruta anterior redirigió manteniendo entorno. Se guardó copia previa fuera del repo durante la validación.
- **Publicación:** rama `Twitch`, commit `fe2b7f82c5254933ced1c39331ee486af58e8806`.

## Historial funcional consolidado del 2026-10-01

Estas entradas recogen decisiones y cambios solicitados durante el prototipado, en el orden aproximado en que se trataron. El estado actual exacto se describe en `PROJECT_SPEC.md`; las ideas no activas aparecen como pendientes.

1. Crear un juego 2D de personajes inspirado en razas/poderes de Dragon Ball, con vuelo, rebotes en mapa, combates, niveles RPG y estadísticas de ataque/defensa física y de ki.
2. Usar la imagen de la Isla Kame como fondo y añadir sprites animados.
3. Hacer que los luchadores reboten linealmente por la pantalla y disponer de control manual de Kamehameha por personaje.
4. Dibujar el Kamehameha como rayo animado horizontal, en la dirección X del personaje; preparar manos hacia atrás y empuje hacia delante antes del disparo, y congelar al personaje mientras el rayo está activo.
5. Mejorar definición y escala de sprites y mantener calidad visual coherente en animaciones de poderes.
6. Al tocarse, personajes empiezan una secuencia de puños/patadas. Definir progresión RPG de nivel 1 a 100, XP, bajas, cuatro estadísticas y persistencia asociada al nombre de usuario.
7. Corregir un estado en que el canvas quedó vacío; no ocultar el juego si no hay luchadores activos.
8. Quitar reinicio de partida; simulación continua incluso con un luchador. Añadir auras que crecen y cambian de verde hacia rojo conforme sube el nivel.
9. Crear chat de arena inspirado en plataformas de stream: `E` para entrar, `K` Kamehameha y `M` Makankosappo; campo de usuario único, botones para simular mensajes. El chat quedó debajo del juego.
10. Mostrar jugadores que ya habían enviado `E`; permitir ingreso individual desde roster, deshabilitar jugadores presentes y botón para agregar todos los pendientes. Evitar duplicados case-insensitive.
11. Migrar persistencia del almacenamiento local a Firebase/Firestore, conectar con `sayayin-c0dfe` y conservar el juego en Hosting estático; registrar que no se debe afirmar que el sitio está desplegado si no se ha verificado.
12. Reorganizar el código con arquitectura mantenible y selector de entornos dev/QA/prod. Los tres namespaces todavía usan el mismo proyecto Firebase.
13. Eliminar poderes automáticos por proximidad; escalar daño y anchura de Kamehameha/Makankosappo con nivel; aplicar resistencias adecuadas y permitir multi-target dentro de la anchura visible.
14. Asignar raza aleatoria a un perfil nuevo entre las cuatro razas, guardándola para entradas futuras.
15. Añadir para Freezer la técnica de dedo `V`/Rayo Mortal. En su progresión propia, `V` primero, después `M` y por último `K`; los poderes posteriores se diseñan más fuertes y delgados. Esto es un perfil Freezer, no una regla global.
16. Añadir barra de XP debajo de vida.
17. Publicar en GitHub ramas `dev` y `Twitch`; `Twitch` es el espacio de integración de stream. Al último registro, ambas recibieron commit `4797126…`; el refactor siguiente se hizo únicamente en `Twitch`.
18. Se pidió recordar la arquitectura de carpetas y el diagrama de dependencias, no solo la arquitectura de Firebase/runtime. Esa precisión quedó reflejada en `ARCHITECTURE.md` y guio el refactor modular de la rama `Twitch`.

## 2026-10-02 — selección rápida de chat y corrección del Rayo Mortal

- **Solicitud:** añadir selección de usuario desde cada fila de luchador; corregir el rayo de Freezer según la referencia visual: láser fino magenta emitido por un dedo.
- **Implementación:** cada luchador ahora tiene un botón **Elegir** que rellena el usuario del chat y resalta el remitente seleccionado, sin cambiar el panel de inspección. El Rayo Mortal entra en el mismo ciclo de avance y colisión que los rayos, y calcula su propio daño y radio de impacto en vez de pasar por la ruta de proyectiles dirigida a un objetivo. Su dibujo es magenta, delgado y luminoso; conserva la dirección horizontal del eje X.
- **Archivos:** public/src/game/arena.js, public/styles/arena.css, docs/PROJECT_SPEC.md.
- **Verificación:** pasó la comprobación de sintaxis de los módulos JavaScript y un smoke test HTTP local: página, CSS, módulos y sprite de poses respondieron 200. No se probó contra Firestore ni se desplegó Hosting.
- **Rama/commit:** rama Twitch; implementación publicada en c37e6c7b3d80405272d638b00ab840f6fd4e3143. Sin despliegue a Firebase Hosting.

## 2026-10-02 — aumentar el daño del Rayo Mortal

- **Solicitud:** el rayo impactaba, pero el daño se sentía demasiado bajo.
- **Decisión:** aumentar solo el multiplicador de daño de `V` de 1.7–2.7 a 2.6–3.4 veces el ataque de ki. El daño sigue descontando defensa de ki y la técnica conserva su posición por debajo de Makankosappo (3.2–4.2) y Kamehameha (5.5–7.0). La anchura y la zona de colisión no cambian.
- **Archivos:** public/src/game/arena.js y docs/PROJECT_SPEC.md.
- **Verificación:** pasó la comprobación de sintaxis ES module y se comprobó la fórmula al nivel 1 y 100; no se escribieron datos de Firestore.
- **Rama/commit:** rama Twitch; cambio publicado en 0f3fa03aa7a4a806373fe364251c377818ae5aa1. Sin despliegue a Firebase Hosting.

## 2026-10-02 — overlay de hitboxes activable

- **Solicitud:** hacer visible y conmutable el área de interacción de cada personaje para diagnosticar impactos de rayos.
- **Implementación:** control en la leyenda del mapa para mostrar/ocultar hitboxes. Cian marca el radio 12 usado por rayos, coral el radio 21 de proyectiles dirigidos, y ámbar el radio 29 por luchador para el umbral melee de 58 entre centros. Overlay apagado por defecto; no cambia la lógica de colisiones.
- **Archivos:** public/index.html, public/styles/arena.css, public/src/game/arena.js, docs/PROJECT_SPEC.md.
- **Verificación:** pasó la sintaxis ES module de los cuatro módulos y el smoke test HTTP: index, CSS, módulos y sprite respondieron 200. Sin escritura de datos de Firebase.
- **Rama/commit:** rama Twitch; implementación publicada en dc2705e6cb628dc79242cdd4773665619b8a563c. Sin despliegue de Firebase Hosting.

## 2026-10-02 — duplicar crecimiento de HP por nivel

- **Solicitud:** cambiar la vida máxima de `100 + 4 × (nivel − 1)` a `100 + 8 × (nivel − 1)`.
- **Implementación:** la HP máxima crece 8 puntos por nivel (100 en nivel 1 y 892 en nivel 100); se aplica al crear perfiles, subir niveles y reingresar. Los perfiles guardados se migran una sola vez según su porcentaje de HP previo, mediante `hpFormulaVersion: 2`.
- **Archivos:** public/src/game/arena.js, public/src/services/firebase/arena-cloud.js y docs/PROJECT_SPEC.md.
- **Verificación:** pasaron las comprobaciones de sintaxis de los módulos de arena y Firestore; el cálculo da 100, 108, 172 y 892 HP en niveles 1, 2, 10 y 100. Index y ambos módulos respondieron HTTP 200. No se mutaron datos de Firebase durante la verificación.
- **Rama/commit:** rama Twitch; implementación publicada en 6a13ca7f0737acc2cdd4f2776276a0dbe1598f89. Sin despliegue de Firebase Hosting.

## Plantilla para entradas futuras

```text
## YYYY-MM-DD — título corto
- Solicitud:
- Decisión/estado: implementado | pendiente | descartado
- Cambios (archivos o módulos):
- Verificación:
- Rama/commit o dependencia pendiente:
```
