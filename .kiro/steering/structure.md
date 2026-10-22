---
inclusion: always
---

# Estructura del repositorio

```text
Sayayines_Godot/
├── AGENTS.md                         # Reglas para agentes (Codex/Claude)
├── CLAUDE.md                         # Punto de entrada para Claude Code
├── .agents/skills/ki-arena-project/  # Skill general de mantenimiento (heredada)
├── .claude/skills/<spec>/SKILL.md    # Una skill de Claude por spec de .kiro
├── .kiro/
│   ├── steering/                     # product, tech, structure, reglas-datos (siempre incluidos)
│   └── specs/<spec>/                 # requirements.md (HUs + EARS), design.md, tasks.md
└── KiArena/
    ├── firebase.json / .firebaserc   # Hosting y proyecto
    ├── FIREBASE.md                   # Notas históricas de entornos y seguridad
    ├── contexto-proyecto/            # Contexto de incorporación escrito por Pedro
    ├── docs/                         # PROJECT_SPEC, ARCHITECTURE, FIRESTORE, TWITCH_INTEGRATION, CHANGELOG
    └── public/                       # Raíz servida por Firebase Hosting
        ├── index.html                # /  arena para el stream
        ├── bot/index.html            # /bot  chat, roster, métricas
        ├── settings/index.html       # /settings  fórmulas, poderes, razas
        ├── ki-arena.html             # redirección histórica a /
        ├── assets/                   # fondo Isla Kame y hojas de sprites
        ├── styles/arena.css
        └── src/
            ├── main.js               # enrutador por pathname
            ├── app/arena-app.js      # arranque de /
            ├── app/bot-app.js        # /bot
            ├── app/settings-app.js   # /settings
            ├── game/arena.js         # simulación, render, duelos, poderes, comandos remotos
            ├── config/firebase.js    # entorno y config web
            ├── config/gameplay-settings.js # defaults, normalización, fórmulas, desbloqueos
            └── services/
                ├── firebase/arena-cloud.js # adaptador REST de Firestore
                └── twitch/README.md        # frontera prevista (sin código)
```

## Mapa spec → código

| Spec (`.kiro/specs/`) | Código principal | Estado |
|---|---|---|
| `arena-en-vivo` | `public/index.html`, `game/arena.js` (frame, draw, auras, hitboxes), `styles/arena.css` | Implementada |
| `entrada-jugadores` | `game/arena.js` (`joinPlayer`, `make`, `init`), `app/bot-app.js` (`sendCommand`) | Implementada |
| `movimiento-y-duelos` | `game/arena.js` (`update`, `startDuel`, `updateDuels`, `hit`) | Implementada |
| `poderes-ki` | `game/arena.js` (`executePower`, `launch*`, `fire*`), `config/gameplay-settings.js` | Implementada (V, M, K) |
| `progresion-rpg` | `config/gameplay-settings.js` (`calculateLevelStats`), `game/arena.js` (`gain`, `xpForNext`) | Implementada |
| `settings-juego` | `settings/index.html`, `app/settings-app.js`, `config/gameplay-settings.js` | Implementada |
| `panel-bot` | `bot/index.html`, `app/bot-app.js` | Implementada |
| `persistencia-firestore` | `config/firebase.js`, `services/firebase/arena-cloud.js` | Implementada |
| `rafaga-ki-b` | — | Pendiente (solo local de Pedro) |
| `integracion-twitch` | `services/twitch/README.md` | Pendiente |
| `integracion-tiktok` | — | Pendiente (solo local de Pedro) |
| `app-escritorio-electron` | — | Pendiente (solo local de Pedro) |
| `seguridad-y-autoridad` | — | Pendiente |
| `autenticacion-usuarios` | (en desarrollo) pantalla de login, Cloud Functions de OAuth, colecciones de usuarios y proveedores | En desarrollo |

## Convenciones

- **Specs:** cada carpeta tiene `requirements.md` (historias de usuario `HU-XXX-NN` con criterios EARS en español: `CUANDO … el sistema DEBE …`, `SI … ENTONCES …`, `MIENTRAS …`, `DONDE …`), `design.md` y `tasks.md` (casillas `[x]` hecho y verificado en código, `[ ]` pendiente, con referencia a los criterios).
- **Skills:** `.claude/skills/<spec>/SKILL.md` explica cómo trabajar en esa área; leer su spec antes de tocar código.
- **Docs fuente:** `KiArena/docs/PROJECT_SPEC.md` sigue siendo la ficha funcional. Si una spec y el código chocan, el código es el comportamiento actual: reconciliar la spec en el mismo cambio.
- **Datos:** cumplir `reglas-datos.md` (id/reference/isActive, borrado suave, `APP_ENV`). La skill `reglas-desarrollo` aplica a todas las specs.
- **Capas:** `game/` no construye URLs Firestore; `services/firebase/` no decide reglas de daño ni desbloqueo; `config/gameplay-settings.js` es la única definición de fórmulas compartida por arena, Bot y Settings.
- Nuevos adaptadores de integración van en `public/src/services/<plataforma>/` y solo traducen eventos a `{ username, command }`.
