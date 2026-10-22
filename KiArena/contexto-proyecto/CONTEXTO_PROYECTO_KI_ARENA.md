# Contexto de proyecto para asistentes de IA — Ki Arena / DBZ_FLOW

> Documento de incorporación para cualquier asistente que vaya a ayudar a desarrollar, revisar o mantener este proyecto. Léelo completo antes de proponer cambios. El código y la documentación del repositorio son la fuente de verdad si este resumen queda desactualizado.

## Descripción breve

**Ki Arena** es un juego continuo de combate 2D, inspirado en Dragon Ball, diseñado para mostrarse en transmisiones verticales de TikTok/OBS. Las personas ingresan con un nombre único, reciben un personaje de una de cuatro razas, recorren la arena, rebotan en sus bordes y combaten automáticamente al acercarse. El progreso RPG y la configuración se guardan en Cloud Firestore. El chat y los controles de operador están en un panel separado del juego.

El proyecto de IA puede llamarse **DBZ_FLOW**. Nombre sugerido del proyecto de producto: **Ki Arena**.

## Meta para pegar en el formulario del proyecto

> Construir y mantener Ki Arena, un juego 2D continuo para transmisiones verticales con progresión RPG, combate y poderes que escalan por nivel, persistencia en Cloud Firestore, panel independiente de Bot/Chat/Settings y una futura integración segura con regalos de TikTok y chats de streaming. Priorizar estabilidad del juego en vivo, evitar duplicados y pérdida de progreso, respetar la arquitectura existente y documentar cada cambio.

## Instrucción principal para el asistente

Actúa como ingeniero/a de software responsable de continuar un proyecto existente, no como alguien que empieza desde cero. Antes de modificar código:

1. Confirma el directorio del repositorio y la rama activa; revisa `git status` y conserva todo cambio local del usuario.
2. Lee `README.md`, `docs/PROJECT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/FIRESTORE.md`, `docs/CHANGELOG.md` y la documentación de la integración que vayas a tocar.
3. Sigue los límites entre las vistas y módulos descritos abajo. Busca la implementación real cuando un detalle no coincida con este resumen.
4. Delimita el cambio a la petición concreta; no rehagas arquitectura, datos ni balance sin motivo.
5. Para una característica jugable, revisa el flujo de punta a punta: interfaz/entrada, validación, ejecución en arena, efecto visual, colisión/daño, persistencia si corresponde, configuración de Settings, documentación y registro en changelog.
6. Ejecuta verificaciones enfocadas y seguras. No abras ni controles el navegador o las ventanas de transmisión del usuario salvo que lo pida explícitamente. No cambies datos reales de Firebase para probar; usa pruebas estáticas, emulador o lecturas de solo consulta.
7. Explica al final qué cambió, qué verificaste, qué quedó pendiente y si se hicieron commits, push o despliegues. No afirmes que algo se publicó o que funciona en vivo sin evidencia.

El usuario valora instrucciones claras y resultados concretos. No le pidas que repita información que ya está documentada. Si hay ambigüedad, avanza en lo independiente y pregunta únicamente por una decisión que realmente cambie el resultado.

## Arquitectura y estructura

El producto es una aplicación web estática de **HTML, CSS y JavaScript ES modules**. Firebase Hosting sirve `public/`; Firestore guarda datos. La aplicación de escritorio opcional está empaquetada con Electron y permite abrir el juego y el control en ventanas separadas. Node/Electron son herramientas de empaquetado/ejecución de escritorio; el backend de datos del juego es Firebase, no un servidor Node propio.

```text
KiArena/
├── .firebaserc                     # Alias de Firebase CLI
├── firebase.json                   # Hosting: raíz public/, rutas limpias y rewrites
├── FIREBASE.md                     # Entornos, datos y seguridad
├── README.md                       # Inicio rápido y enlaces a documentación
├── package.json                    # Scripts para Electron/portable Windows
├── desktop/main.cjs                # Ventanas y servidor loopback de archivos estáticos
├── scripts/                        # Ayudantes para empaquetado portable
├── dist/windows/                   # Artefactos de escritorio; no es fuente de verdad
├── docs/
│   ├── PROJECT_SPEC.md             # Reglas de producto, juego y progresión
│   ├── ARCHITECTURE.md             # Carpetas, responsabilidades y dependencias
│   ├── FIRESTORE.md                # Modelo de datos y persistencia
│   ├── TWITCH_INTEGRATION.md       # Diseño/pendientes para Twitch
│   ├── TIKTOK_INTEGRATION.md       # Contrato de regalos y límites actuales
│   └── CHANGELOG.md                # Registro de solicitudes y cambios
└── public/
    ├── index.html                  # `/`: arena para transmitir, sin controles de chat
    ├── bot/index.html              # `/bot`: chat, roster y métricas de operador
    ├── settings/index.html         # `/settings`: fórmulas, poderes y razas activas
    ├── assets/                     # Fondo, sprites y efectos
    ├── styles/arena.css            # Estilos compartidos
    └── src/
        ├── main.js                 # Selección e inicialización de vista
        ├── app/arena-app.js         # Vista de arena
        ├── app/bot-app.js           # Chat, comandos, roster, métricas y simulación de regalo
        ├── app/settings-app.js      # Formulario de configuración
        ├── game/arena.js            # Canvas, movimiento, combate, animaciones y poderes
        ├── config/firebase.js       # Selección del entorno
        ├── config/gameplay-settings.js # Valores y fórmulas predeterminados
        └── services/
            ├── firebase/arena-cloud.js # Lectura/escritura Firestore y eventos
            ├── twitch/              # Punto de integración futura
            └── tiktok/              # Adaptador de eventos normalizados; no receptor real
```

### Responsabilidades

- **`/`** muestra solo el juego. Canvas lógico vertical 540 × 960 (9:16), fondo de Isla Kame, luchadores, auras y combates. `?stream=1` ofrece una vista limpia para captura de transmisión.
- **`/bot`** es el panel del operador: chat, comandos, selección de remitente, entrada/roster, métricas y registro de combate. Debe permanecer en otra ventana durante el stream si hace falta operar sin alterar la escena.
- **`/settings`** permite editar fórmulas por nivel, curvas de técnicas y razas elegibles. Debe ser independiente de la vista que se transmite.
- **`game/arena.js`** contiene el ciclo de juego y las reglas de combate. No mezclar allí código de formulario o persistencia específica de Settings.
- **`arena-cloud.js`** adapta la persistencia Firestore. No debe decidir reglas de daño ni desbloqueo.
- **`gameplay-settings.js`** conserva defaults, normalización y cálculo de atributos/multiplicadores. Settings y combate deben usar una misma definición para evitar desajustes.

## Juego y reglas funcionales vigentes

### Arena, personajes y entrada

- Razas: **Saiyajin, Namekuseijin, Humano y Freezer**. La raza de un perfil nuevo se sortea entre las razas habilitadas en Settings y queda guardada; no se vuelve a sortear en reingresos.
- No crear participantes CPU arbitrarios al cargar. La arena representa perfiles que entran por chat o que ya están guardados como vivos en Firestore.
- El nombre de usuario normalizado es único sin distinguir mayúsculas/minúsculas. La clave habitual es `usernameKey`. Un intento duplicado no crea otro personaje ni vuelve a publicar mensajes de entrada.
- `E` crea un perfil nuevo en nivel 1 o reingresa el perfil persistido conservando nivel, XP, raza, bajas y KOs. El HP al reingresar sigue la regla implementada en la especificación.
- Si queda un solo luchador, la simulación continúa y ese luchador sigue rebotando. No hay botón de reinicio de partida.
- Cada persona se mueve y rebota en los bordes. Al acercarse, comienza un duelo cuerpo a cuerpo animado. Los ataques cuerpo a cuerpo se alternan; no deben dispararse poderes automáticos al entrar.
- Auras cambian gradualmente de verde a rojo y aumentan de tamaño con el nivel. Las hitboxes se pueden encender y apagar para depuración.

### Nivel, atributos y XP

- Nivel entre **1 y 100**. Denota el nivel como `N`; fórmulas usan `N − 1` para que las estadísticas comiencen en el valor base.
- Fórmulas base documentadas (los multiplicadores editables se guardan por entorno):
  - HP máximo: `100 + M_hp × (N − 1)`; default `M_hp = 8`.
  - Ataque físico: `9 + M_fis × (N − 1)`; default `M_fis = 1.35`.
  - Defensa física: `5 + M_defFis × (N − 1)`; default `M_defFis = 0.7`.
  - Ataque de Ki: `12 + M_ki × (N − 1)`; default `M_ki = 1.4`.
  - Defensa de Ki: `5 + M_defKi × (N − 1)`; default `M_defKi = 0.8`.
- El nivel y XP son datos persistidos del personaje (`level`, `xp`). No inferir el nivel a partir del nombre o de las bajas; al cargar, mostrar el nivel de Firestore y no reescribirlo por una estimación.
- Una baja otorga XP; el requisito escala con el nivel y está definido en `docs/PROJECT_SPEC.md` y en la implementación. XP y barra de progreso deben reflejar el dato real y limitarse a nivel 100.
- El daño recibido usa la defensa correspondiente con mínimo de daño. Valor documentado: `max(4, daño bruto − defensa × 0.45)`. Verificar el código vigente antes de modificar balance.
- Si se añade una estadística o fórmula, debe poder consultarse/configurarse en Settings y quedar documentada.

### Poderes, entradas y validaciones

| Comando | Poder | Acceso establecido |
|---|---|---|
| `E` | Entrar/reingresar | Nombre válido y perfil no duplicado en arena |
| `B` | Ráfaga de Ki | Todas las razas, desde nivel 5; haz universal de una mano |
| `V` | Rayo Mortal de Freezer | Solo raza Freezer, desde nivel 1 |
| `M` | Makankosappo | Todas las razas, desde nivel 10 |
| `K` | Kamehameha | Todas las razas, desde nivel 20 |

- La disponibilidad se valida en Bot antes de enviar y en la arena al ejecutar. Un comando bloqueado debe rechazarse con una explicación, no guardarse como ataque aceptado ni disparar otro poder por error.
- Los rayos son horizontales y siguen el signo de la velocidad X del personaje. El grosor/área visual debe corresponder al área de colisión y poder alcanzar a todos los blancos dentro del recorrido una vez por rayo.
- B debe ser un haz simple cian/blanco, con preparación, pose de mano extendida y animación visible. Escala el ancho con nivel y aplica defensa de Ki.
- V es el láser magenta fino del dedo de Freezer. Makankosappo y Kamehameha tienen animaciones propias. Cada uno debe conservar área, curva de daño, requisito y resistencia adecuados.
- La progresión especial Freezer mantiene el diseño pedido: Rayo Mortal → Makankosappo → Kamehameha, con técnicas posteriores más delgadas y de mayor potencia. Esta relación se aplica a ese perfil únicamente, no globalmente.
- Toda nueva técnica debe agregarse al catálogo/Settings con su curva, mínimo de nivel, raza, geometría, fórmula de daño y descripción. No añadir solo un botón sin conectar el flujo de juego.

## Firebase y datos

- Proyecto Firebase CLI de referencia: **`sayayin-c0dfe`**. La configuración web está en el código fuente y no equivale a una credencial secreta. No copiar llaves privadas, tokens, archivos de credenciales o variables sensibles a este contexto.
- Persistencia principal: **Cloud Firestore**; la app no debe usar `localStorage` como base de verdad para jugadores, chat, configuraciones o progreso.
- Entornos seleccionables: `dev`, `qa`, `prod`, normalmente por `?env=dev|qa|prod` o el selector de cada panel.
- Actualmente los tres namespaces son separación lógica dentro del mismo proyecto de Firebase, no proyectos/roles/cuotas aislados. No describirlos como aislamiento de seguridad.
- Colecciones relevantes incluyen perfiles, mensajes, eventos de combate y configuración de juego; consulta los paths y campos exactos en `docs/FIRESTORE.md` y `public/src/services/firebase/arena-cloud.js` antes de tocar datos.
- Perfiles contienen datos como `username`, `usernameKey`, `race`, `level`, `xp`, `hp`, `maxHp`, `alive`, `kills`, `deaths`, y versiones de esquema/fórmula. Mantener compatibilidad y evitar normalizaciones destructivas.
- Settings se almacenan por entorno. No modificar datos reales, borrar colecciones ni migrar/escribir masivamente durante pruebas sin autorización explícita y un plan de respaldo.
- Hay que tratar progreso Firestore como fuente de verdad para nivel y XP. Ante una lectura fallida, mostrar error/estado; no crear perfiles de reemplazo ni sobrescribir silenciosamente con valores por defecto.

## Streaming, TikTok y Twitch: estado real

- La raíz está pensada para escena vertical 9:16. Bot y Settings son herramientas auxiliares para una ventana/pantalla de operador separada.
- Está implementado un adaptador de **eventos de regalo normalizados** de TikTok que puede traducir un evento mapeado a un comando de juego y un control para simular un regalo.
- **No está conectado a TikTok Live**, no hay receptor real, credenciales, OAuth ni webhook/listener que lea regalos de un canal. Un botón de simulación no significa integración en vivo.
- Twitch está documentado como punto de extensión/diseño. **No hay lectura de chat real ni conexión OAuth activa**.
- Para una integración real futura: usar un backend confiable, autenticar el canal, validar origen/esquema, deduplicar IDs de eventos/regalos, limitar frecuencia, mapear regalos explícitamente a comandos permitidos, aplicar requisitos del personaje y proteger Firestore. Nunca poner tokens secretos en JavaScript servido al navegador.
- La lógica actual de combate y la asignación de XP/KO corren en cliente; aún no es un servidor autoritativo. Para transmisiones abiertas se debe evaluar servidor/Cloud Functions antes de confiar en recompensas o prevenir manipulación.

## Aplicación portable de Windows

- Fuente: Electron (`desktop/main.cjs`) envuelve los archivos estáticos de `public/`; Electron no es la base de datos.
- La app inicia un servidor HTTP de loopback para servir archivos al cliente. Los datos siguen en Firestore; se requiere Internet para sincronización.
- El ejecutable del juego abre la arena 9:16; el lanzador auxiliar abre Bot/Control. Pueden usarse como ventanas separadas para no cambiar la escena en vivo.
- `dist/windows/` contiene productos generados y puede estar desactualizada con respecto al código. Verifica fecha/build antes de indicar qué exe debe abrir el usuario. No regenerar o sobrescribir artefactos sin revisar el estado.
- Scripts actuales en `package.json`: `npm run start:desktop`, `npm run start:control`, `npm run build:windows`.

## Estado del checkout conocido al preparar este contexto

- Rama observada: `separate`.
- El repositorio tenía modificaciones locales sin commit, incluyendo cambios de la función Ráfaga B, documentación y construcción de escritorio. No descartarlas, resetearlas ni asumir que están en GitHub.
- Hay una compilación portable Build B mencionada en el historial; verifica el artefacto actual antes de compartir enlaces o pedir que el usuario abra una build específica.
- No se confirmó una publicación nueva a Firebase Hosting para esos cambios. No afirmar que GitHub, Firebase Hosting o una plataforma de streaming contiene la última versión sin verificarlo.
- Las rutas del juego en desarrollo suelen servirse en `http://127.0.0.1:5000/`, `/bot/` y `/settings/`, pero solo cuando el servidor/emulador correspondiente esté activo.

## Cómo validar cambios sin afectar la transmisión

1. Leer la petición y localizar la fuente de verdad antes de editar.
2. Revisar estado Git y conservar cambios existentes.
3. Hacer la corrección más pequeña que cubra tanto UI como regla de juego.
4. Ejecutar, según aplique, `node --check` en JS, `git diff --check`, pruebas de fórmulas/desbloqueo y smoke test HTTP local. No lanzar controles en la ventana del usuario si este pidió probarlo por su cuenta.
5. Probar desbloqueos justo debajo y en el nivel requerido; verificar razas autorizadas/no autorizadas, daño, HP/defensa, hitbox, dirección, animación y no duplicación.
6. Para cambios visibles, asegurar que etiqueta, ayuda, roster, Bot, Settings y arena describan el mismo comando y requisito.
7. Añadir la decisión a `docs/PROJECT_SPEC.md` si es una regla nueva y registrar cada instrucción/cambio en `docs/CHANGELOG.md` con fecha, alcance y verificaciones.
8. Comprobar `git diff` antes de terminar. No hacer commit, push, deploy, migración o limpieza destructiva salvo que el usuario lo haya pedido.

## Prioridades de producto

1. La arena debe mostrarse siempre y seguir viva: una falla de Firebase no debe ocultar el mapa ni detener el render; debe informar el error claramente.
2. Progreso real, nivel, XP, raza y unicidad de usuarios deben ser confiables.
3. Daño, resistencia, anchura visible y hitbox de cada poder deben concordar y escalar según las reglas de Settings.
4. El operador necesita controlar el juego desde Bot sin tapar/cambiar la ventana transmitida.
5. La integración con TikTok/Twitch debe distinguirse claramente entre simulación actual y conexión real futura.
6. Mantener código legible, modular, documentado y compatible con perfiles Firestore existentes.

## Documentación fuente para ampliar el contexto

- `README.md`: estructura y ejecución rápida.
- `docs/PROJECT_SPEC.md`: ciclo de juego, balance, desbloqueos, fórmula, rutas y límites.
- `docs/ARCHITECTURE.md`: responsabilidades y diagrama de dependencias.
- `docs/FIRESTORE.md` y `FIREBASE.md`: datos, entornos, reglas y comandos Firebase.
- `docs/TIKTOK_INTEGRATION.md` y `docs/TWITCH_INTEGRATION.md`: estado real e integración futura.
- `docs/CHANGELOG.md`: cronología de instrucciones y cambios ya realizados.

**Principio final:** ante cualquier contradicción, inspeccionar el código y documentación actuales; informar la diferencia y corregir también este contexto o los documentos fuente si cambió una decisión. Nunca inventar estado de despliegue, datos, credenciales, conexión de stream o comportamiento no verificado.
