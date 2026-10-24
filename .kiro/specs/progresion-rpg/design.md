# Diseño — Progresión RPG

> **Rutas Firestore (obligatorio):** todo modelo de este módulo vive en `environments/{APP_ENV}/{colección}/{id}`: colección raíz `environments`, un documento por entorno (`dev`, `qa`, `prd`) y dentro todas las colecciones. Cualquier ruta abreviada en este archivo (`kiArenaX/{id}`) cuelga de ese prefijo. Ver `.kiro/steering/reglas-datos.md`.

## Funciones

| Función | Archivo | Nota |
|---|---|---|
| `calculateLevelStats(level, settings)` | `config/gameplay-settings.js` | Pura; devuelve `maxHp, ki, physicalAttack, physicalDefense, kiDefense` |
| `xpForNext(level)` | `game/arena.js` **y** `app/bot-app.js` | Duplicada: mantener ambas iguales o moverla a `gameplay-settings.js` |
| `gain(f, victim)` | `game/arena.js` | XP, bucle de subidas, recálculo, `saveFighter` |
| `make(...)` | `game/arena.js` | HP proporcional y migración `hpFormulaVersion` |
| `applySettingsToFighters()` | `game/arena.js` | Recalcula conservando % de HP (usado por el formulario embebido heredado) |

## Tabla de referencia (defaults)

| N | HP | Atq. físico | Def. física | Atq. ki | Def. ki | XP para subir |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 100 | 9 | 5 | 12 | 5 | 125 |
| 10 | 172 | 21.15 | 11.3 | 24.6 | 12.2 | 470 |
| 20 | 252 | 34.65 | 18.3 | 38.6 | 20.2 | 1100 |
| 100 | 892 | 142.65 | 74.3 | 150.6 | 84.2 | — |

## Decisiones

- El nivel es dato persistido; los atributos son derivados. Así un cambio de balance afecta a todos sin migraciones.
- La XP se calcula en el navegador (no autoritativo). Ver `seguridad-y-autoridad`.
