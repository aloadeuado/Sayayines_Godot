# Arquitectura de Ki Arena

## Estado ejecutable

Firebase Hosting sirve `KiArena/public/`. No hay proceso Node en producción ni paso de compilación. `public/index.html` carga CSS y un módulo ES que compone la configuración, el repositorio Firebase y la aplicación. La URL histórica `public/ki-arena.html` conserva el query string y redirige a `index.html`.

```text
Repositorio/
├── AGENTS.md                         # Contexto de trabajo del repositorio
├── .agents/skills/ki-arena-project/  # Skill de mantenimiento
├── KiArena/
│   ├── .firebaserc                   # Alias del proyecto Firebase CLI
│   ├── firebase.json                 # Hosting: public/, cleanUrls y rewrites
│   ├── README.md / FIREBASE.md
│   ├── docs/                         # Especificaciones y registro
│   └── public/
│       ├── index.html                # Ruta /: Arena directa (canvas, hitboxes)
│       ├── bot/
│       │   └── index.html            # Ruta /bot: Chat, roster y métricas
│       ├── settings/
│       │   └── index.html            # Ruta /settings: Fórmulas y personajes
│       ├── ki-arena.html             # Redirección compatible a /
│       ├── assets/                   # Fondo y hojas de sprites
│       ├── styles/arena.css          # Estilos unificados y responsive
│       └── src/
│           ├── main.js               # Detección de ruta y orquestador
│           ├── app/
│           │   ├── arena-app.js      # Arranque de la arena (/)
│           │   ├── bot-app.js        # Lógica de chat, roster y métricas (/bot)
│           │   └── settings-app.js   # Lógica del formulario de ajustes (/settings)
│           ├── config/firebase.js    # Entorno y configuración web
│           ├── config/gameplay-settings.js # Fórmulas y multiplicadores por nivel
│           ├── game/arena.js         # Simulación, canvas, duelos y comandos remotos
│           └── services/
│               ├── firebase/arena-cloud.js # Persistencia y eventos en Firestore
│               └── twitch/README.md  # Contrato previsto; sin cliente activo
└── KiArena/docs/
```

## Responsabilidades y límites

| Módulo / Vista | Responsabilidad | No debe asumir |
|---|---|---|
| `main.js` | Enrutador del frontend: según la ruta (`/`, `/settings`, `/bot`), inicializa el submódulo correspondiente. | Reglas de combate o renderizado. |
| `app/arena-app.js` | Inicializar la vista directa de la arena de juego en `/`. | Manejo de formularios de settings o chat bot. |
| `app/bot-app.js` | Gestionar chat en vivo, comandos (`E`, `K`, `M`, `V`), roster interactivo, métricas globales, atributos de jugador seleccionado y feed de eventos. | Renderizado del canvas ni bucle de físicas. |
| `app/settings-app.js` | Gestionar el formulario de ajustes de fórmulas por nivel, multiplicadores de daño y razas habilitadas. | Control de combate ni simulación en vivo. |
| `game/arena.js` | Bucle de animación, movimiento, rebotes, duelos, técnicas, canvas y ejecución de comandos remotos de Firestore. | Construir URLs Firestore ni contener secretos Twitch. |
| `config/firebase.js` | Validar `env` de URL y componer el espacio lógico del proyecto. | Autenticación o aislamiento real entre proyectos. |
| `config/gameplay-settings.js` | Valores predeterminados, normalización, estadísticas derivadas de `N`, multiplicadores de poderes y razas habilitadas. | Persistencia, eventos de UI o reglas de combate. |
| `services/firebase/arena-cloud.js` | Adaptar lecturas y escrituras Firestore (`get`, `save`, `getSettings`, `saveSettings`, `addMessage`, `addEvent`, `listMessages`, `listEvents`, `listPlayers`). | Reglas de combate ni autoridad de XP/KO. |
| `services/twitch/` | Futuro adaptador: traducir mensaje entrante a nombre y comando de arena. | Persistir directamente el perfil o ejecutar combate. |

Dependencias actuales:

```mermaid
flowchart TD
    Index[public/index.html /] --> Main[src/main.js]
    BotHtml[public/bot/ /bot] --> Main
    SettingsHtml[public/settings/ /settings] --> Main
    CSS[styles/arena.css] --> Index & BotHtml & SettingsHtml
    Main --> Config[config/firebase.js]
    Main --> Firebase[services/firebase/arena-cloud.js]
    Main --> ArenaApp[app/arena-app.js]
    Main --> BotApp[app/bot-app.js]
    Main --> SettingsApp[app/settings-app.js]
    ArenaApp --> Game[game/arena.js]
    BotApp --> Firebase
    SettingsApp --> Firebase
    Game --> Firebase
    Game --> Assets[assets/]
    Twitch[services/twitch: pendiente] -. eventos E/V/M/K .-> Firebase
    Firebase --> Firestore[(Cloud Firestore)]
```

## Límites conocidos / siguiente refactor

`game/arena.js` conserva hoy el bucle, reglas de combate, dibujo, paneles y manejo del chat para disminuir el riesgo de regresión durante el primer cambio de carpetas. La separación de carpetas y del adaptador de datos ya existe; el módulo de arena no está aún dividido internamente en `engine`, `renderer`, `combat`, `chat` y `roster`. Hacerlo en pasos pequeños, preservar una interfaz de estado explícita y volver a verificar el canvas después de cada extracción.

La capa Firebase usa el API REST de Firestore desde el navegador y expone una interfaz global compatible con el motor actual. No hay Firebase Admin SDK, Cloud Functions ni servidor de juego. El API key web identifica el proyecto y no sustituye reglas de acceso.

## Ejecutar y verificar

Desde `KiArena/`:

```powershell
firebase.cmd emulators:start --only hosting --project sayayin-c0dfe
```

Abre `http://127.0.0.1:5000/` o la ruta compatible `/ki-arena.html?env=dev`. Hosting debe servir el contenido de `public/`; la configuración de entorno determina las colecciones consultadas.
