# Diseño — Arena en vivo

> **Rutas Firestore (obligatorio):** todo modelo de este módulo vive en `environments/{APP_ENV}/{colección}/{id}`: colección raíz `environments`, un documento por entorno (`dev`, `qa`, `prd`) y dentro todas las colecciones. Cualquier ruta abreviada en este archivo (`kiArenaX/{id}`) cuelga de ese prefijo. Ver `.kiro/steering/reglas-datos.md`.

## Componentes

| Archivo | Rol |
|---|---|
| `public/index.html` | Encabezado (estado Firebase, enlaces `/bot` y `/settings`, selector de entorno), leyenda de razas, toggle de hitboxes, `<canvas id="game">`, pie. |
| `public/src/main.js` | Crea `KI_ARENA_FIREBASE` y `kiArenaCloud` globales; si la ruta no es `/bot` ni `/settings`, llama `startArena()`. |
| `public/src/app/arena-app.js` | Fachada: `startArena()` → `initArena()`. |
| `public/src/game/arena.js` | Todo lo demás: estado (`fighters`, `bolts`, `particles`, `duels`, `logs`), bucle `frame(ts)`, `update(dt,t)`, `draw(t)`, `drawAura`, `drawChargeAura`, `drawHitboxes`, `sprite`. |
| `public/styles/arena.css` | Layout responsive compartido por las tres vistas. |

## Bucle

```text
start(): wireChat(); wireSettings(); requestAnimationFrame(frame)   ← render primero
         await loadGameSettings() → reloadCloudPlayers() → init() → refreshMessages(inicial)
         setInterval(refreshMessages, 2500); setInterval(reloadCloudPlayers, 8000)
frame(ts): dt = min(0.04, Δt); update(dt,t); draw(t); cada 400 ms drawRoster()
```

`dt` se limita a 40 ms para que una pestaña en segundo plano no provoque saltos.

## Sprites y assets

Hojas en `public/assets/`: `fighter-sprites-v1.png` (vuelo), `fighter-melee-poses-v1.png`, `fighter-kame-poses-v1.png`, `fighter-makankosappo-v1.png`, fondo `kame-house-background.png`. `SPRITE_SCALE` reduce las poses base. El color de raza viene de `races = [[Saiyajin,#ff9d3d],[Namekuseijin,#68e47b],[Humano,#68b9ff],[Freezer,#c487ff]]`.

## Resiliencia

- `loadGameSettings` atrapa el error y usa defaults normalizados.
- El `try/catch` de `start()` escribe el error en el estado y en el chat, pero `frame` ya está corriendo.
- `arena.js` comprueba nulidad de nodos DOM (`#selected`, chat, roster) porque la vista `/` no los tiene todos.

## Decisiones

- `arena.js` sigue siendo un módulo combinado para no romper el combate; la extracción a `engine/renderer/combat/chat/roster` debe hacerse por pasos pequeños y verificados (ver `ARCHITECTURE.md`).
- No hay botón de reinicio: la arena es continua.
