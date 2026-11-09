# Ki Arena

Juego de arena 2D en HTML, CSS y JavaScript. Firestore guarda los perfiles, el progreso, el chat y las bajas; el navegador ejecuta la simulación y presenta el canvas.

## Estructura y Vistas

```text
KiArena/
├── firebase.json                 # Firebase Hosting: public/, cleanUrls y rewrites
├── .firebaserc                   # Proyecto de Firebase CLI
├── FIREBASE.md                   # Datos, entornos y seguridad
├── docs/                         # Especificaciones e historial
└── public/
    ├── index.html                # Ruta /: Arena de combate limpia para stream
    ├── bot/
    │   └── index.html            # Ruta /bot: Chat, roster y métricas en vivo
    ├── settings/
    │   └── index.html            # Ruta /settings: Ajustes de fórmulas y personajes
    ├── ki-arena.html             # Redirección a /
    ├── assets/                   # Fondo, sprites y efectos
    ├── styles/arena.css          # Estilos unificados y responsive
    └── src/
        ├── main.js               # Enrutador e inicializador
        ├── app/
        │   ├── arena-app.js      # Entrada de la arena (/)
        │   ├── bot-app.js        # Entrada de bot, chat y métricas (/bot)
        │   └── settings-app.js   # Entrada de configuración (/settings)
        ├── game/arena.js         # Canvas, animación, duelos y comandos remotos
        ├── config/firebase.js    # Selección dev/qa/prod y configuración web
        ├── config/gameplay-settings.js # Fórmulas de nivel y multiplicadores
        └── services/
            ├── firebase/arena-cloud.js # Persistencia y eventos Firestore
            └── twitch/                 # Punto previsto para conectar Twitch
```

### Rutas disponibles
- **`/`**: Ventana del juego directa con canvas 2D (`900 × 540`), física arcade, duelos automáticos e hitboxes activables.
- **`/bot`**: Panel interactivo con chat, atajos (`E`, `K`, `M`, `V`), roster con barras de HP, selección de remitente, botón 'Agregar todos', métricas globales, atributos de luchador seleccionado y feed de eventos.
- **`/settings`**: Panel para configurar multiplicadores por nivel de estadísticas (HP, Ki, Ataque, Defensas), daño de poderes y razas habilitadas.

La lógica de arena se conserva junta en `game/arena.js` durante esta primera reorganización para reducir el riesgo de alterar el combate. La interfaz, el motor, el chat y el input se pueden extraer a módulos más pequeños después, conservando la misma API de persistencia.

## Entornos

El selector usa `?env=dev`, `?env=qa` o `?env=prod` para elegir las colecciones. Hoy esos espacios comparten el proyecto `sayayin-c0dfe`; son separación lógica, no aislamiento de permisos, cuotas o facturación. Producción real debe usar su propio proyecto Firebase y reglas.

La página anterior `/ki-arena.html` permanece disponible como redirección a `/index.html`, conservando el parámetro del entorno. La simulación vive en memoria; Firestore mantiene los datos persistentes.

## Desarrollo local

Desde `KiArena/`, ejecuta `firebase.cmd emulators:start --only hosting --project sayayin-c0dfe` y abre `http://127.0.0.1:5000/`.

## Documentación detallada

- [`docs/PROJECT_SPEC.md`](docs/PROJECT_SPEC.md): reglas de juego, luchadores, progresión, poderes y estado pendiente.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): carpetas, módulos, dependencias y ejecución.
- [`docs/FIRESTORE.md`](docs/FIRESTORE.md): rutas, campos, sincronización, entornos y seguridad.
- [`docs/TWITCH_INTEGRATION.md`](docs/TWITCH_INTEGRATION.md): alcance planeado, OAuth y preguntas pendientes.
- [`docs/CHANGELOG.md`](docs/CHANGELOG.md): registro acumulativo de instrucciones y cambios.
- `../AGENTS.md` y `../.agents/skills/ki-arena-project/SKILL.md`: contexto y flujo para agentes de desarrollo.
