---
name: integracion-tiktok
description: Diseñar o implementar la integración de Ki Arena con TikTok Live en la app de escritorio - entrar con «e» en el chat, likes que curan, regalos que lanzan poderes, espera de reingreso y simulación en /bot.
---

# Ki Arena · integracion-tiktok

> **Rutas Firestore (obligatorio):** todo modelo de este módulo vive en `environments/{APP_ENV}/{colección}/{id}`: colección raíz `environments`, un documento por entorno (`dev`, `qa`, `prd`) y dentro todas las colecciones. Cualquier ruta abreviada en este archivo (`kiArenaX/{id}`) cuelga de ese prefijo. Ver `.kiro/steering/reglas-datos.md`.

## Reglas obligatorias (siempre)

Antes de tocar datos o rutas, aplica la skill `reglas-desarrollo` (`.kiro/steering/reglas-datos.md`): todo modelo Firestore lleva `id`, `reference` e `isActive` con borrado suave (nunca `DELETE`), y las rutas salen de `APP_ENV` = `dev` | `qa` | `prd`.

## Antes de empezar

1. Lee `.kiro/steering/` (product, tech, structure, reglas-datos).
2. Lee la spec `.kiro/specs/integracion-tiktok/` completa: `requirements.md`, `design.md`, `tasks.md`.
3. Lee el inicio de `KiArena/docs/CHANGELOG.md` y la sección pertinente de `KiArena/docs/PROJECT_SPEC.md`.
4. Revisa el código actual: si contradice la spec, el código manda y la spec se corrige en el mismo cambio.

## Archivos del área

- Spec: `.kiro/specs/integracion-tiktok/`
- Receptor (proceso principal de Electron): `KiArena/desktop/tiktok/receiver.js`
- Canal local: `KiArena/desktop/server.js` (`GET /api/tiktok/status|events` por SSE; `POST /api/tiktok/connect|disconnect|simulate`, solo mismo origen)
- Menú y preferencias: `KiArena/desktop/main.js`
- Mapeo puro: `KiArena/public/src/services/tiktok/map-event.js`; cliente: `.../tiktok/live-client.js`
- Panel y simulador: `KiArena/public/tiktok/index.html`, `KiArena/public/src/app/tiktok-app.js`
- Juego: `KiArena/public/src/game/arena.js` (`handleTikTok`, `healPlayer`, `queueGiftPowers`, `launchBlast`, `rejoinWait`)
- Ajustes: `KiArena/public/src/config/gameplay-settings.js` (`tiktok`, `rejoinCooldownSeconds`) y `/settings`
- Pruebas: `node KiArena/scripts/test-tiktok-map.mjs`
- Doc: `KiArena/docs/TIKTOK_INTEGRATION.md`

## Reglas del área

- Todo corre en la máquina de Pedro, dentro de la app de escritorio (Windows y macOS). Nada de Cloud Functions ni servidores propios externos para TikTok.
- La conexión es por @usuario del live con `tiktok-live-connector`; nunca pedir ni guardar la contraseña o tokens de TikTok. Una API key de firma, si hace falta, va en `KiArena/config/environments/{env}.local.env` (`TIKTOK_SIGN_API_KEY`, ignorado por Git).
- Los eventos llegan a la arena por SSE local; los likes NO se escriben en Firestore uno por uno.
- `e`/`E` en el chat del live = entrar con ID `tiktok_{userId}` y el @usuario limpio como nombre.
- Like = +`likeHealHp` HP (1 por defecto) hasta `maxHp`; no revive ni crea guerreros.
- Regalo = poder según el mapa explícito (Rosa = Ráfaga de Ki de una mano, León = Genkidama…). Respeta nivel y raza, NO tiene enfriamiento y va a una cola de máx. 5 por espectador. Si el poder está bloqueado sale la Ráfaga de Ki. Regalo sin mapa = solo agradecimiento.
- Con letra (`K`, `M`, `V`, `B`) los poderes respetan nivel, raza y enfriamiento.
- La Ráfaga de Ki (`kiBlast`) es el único poder para todos desde nivel 1, con pose a una sola mano.
- Mismo número de poderes cuerpo a cuerpo que de ki en cada escalón del mapa.
- Motores de regalo: `kiBlast`, `melee` (`MELEE` en `arena.js`: golpes y daño por golpe), rayos sobre `kamehameha` y `spiritBomb` (el chat de TikTok carga la Genkidama con `chargeSpirit`).
- Quien llega a 0 HP sale del tablero y espera `rejoinCooldownSeconds` (10 s) para volver con «e», en todas las plataformas. No hay botón para sacar jugadores.
- Deduplicar por ID de evento (`tiktok_{msgId}`) y limitar a 20 poderes/s en toda la arena.
- La simulación de `/bot` se rotula «simulado» y nunca dice que TikTok está conectado.
- Nombres de poderes del doblaje latino.
- Los campos nuevos de Firestore (`settingsJson.tiktok`, `rejoinCooldownSeconds`, `platform`, `externalId`, `gift.*`) son PROPUESTA: no se escriben hasta que Pedro los apruebe (ver `design.md`).

## Cómo trabajar una tarea

1. Elige la tarea en `tasks.md` (o crea la HU y la tarea si es nueva).
2. Haz el cambio mínimo que cumpla sus criterios EARS.
3. Revisa el flujo de punta a punta: entrada → validación → arena → efecto visual → daño/colisión → persistencia → Settings → docs.
4. Marca la tarea `[x]` solo si quedó implementada y verificada.

## Verificación antes de entregar

```bash
(cd KiArena/desktop && npm run check)
for f in $(git ls-files 'KiArena/public/src/*.js'); do node --check "$f"; done
git diff --check
```

- No abrir el navegador ni las ventanas de stream de Pedro; no escribir, borrar ni migrar datos reales de Firestore.
- Añadir entrada fechada en `KiArena/docs/CHANGELOG.md` (solicitud, archivos, verificación, rama/commit).
- Si cambia una regla, actualizar `KiArena/docs/PROJECT_SPEC.md` y los criterios de la spec; marcar las tareas `[x]`.
- No hacer commit, push ni deploy sin pedido explícito.
