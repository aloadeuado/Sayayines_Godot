# Registro de instrucciones y cambios de Ki Arena

Este registro es acumulativo. Cada nueva instrucción del usuario sobre juego, arquitectura, datos, entornos, Twitch, publicación o seguridad recibe una entrada fechada. Las propuestas no implementadas se anotan como pendientes; las preguntas informativas no cambian requisitos y se registran solo si aportan una decisión al proyecto.

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
