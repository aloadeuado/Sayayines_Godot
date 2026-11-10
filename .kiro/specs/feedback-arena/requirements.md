# Requisitos — Feedback visual en la arena (iconos de poderes y mensajes rojos)

> **Estado:** implementada (2026-11-10) en `feature/feedback-arena` (issue #8). Pedro pidió avanzar sin responder P1–P4, así que se aplicó la recomendación de cada una; se pueden cambiar. No cambia ningún modelo de Firestore.
>
> **Dependencia:** los casos **(TikTok)** usan la cola de regalos de `integracion-tiktok`, ya en `dev` (PR #9).

## Introducción

Hoy, cuando alguien escribe una letra que no puede usar, el motivo solo aparece como línea «Sistema» en el chat lateral, que el público del directo casi nunca mira. Esta spec pone el feedback **sobre el luchador**:

1. Una fila de iconos pequeños debajo del nombre con los poderes que tiene, cuántos le quedan en cola y si están recargando, más un hueco reservado para buffs futuros.
2. Un mensaje rojo flotante encima del luchador cuando una acción no se puede hacer, con un texto fijo por caso.

## Requisitos

### HU-FB-01 — Iconos de poderes bajo el nombre
**Historia de usuario:** Como espectador del directo, quiero ver bajo el nombre de cada guerrero qué poderes tiene y cuántos le quedan, para saber qué puede lanzar sin leer el chat.

**Criterios de aceptación**
1. MIENTRAS el luchador esté vivo, el sistema DEBE dibujar debajo de su nombre una fila de iconos circulares de 14 px, centrada sobre el luchador.
2. La fila DEBE incluir un icono por cada poder que el luchador puede usar con letra (`availablePowers` con `command`), en el orden V, B, M, K, y además cualquier poder que tenga en la cola de regalos aunque no tenga letra (p. ej. Genkidama).
3. Cada icono DEBE usar el color del poder (`visual.color` o `color`) y mostrar la letra del comando; si no tiene letra, la inicial del nombre.
4. SI el luchador tiene N > 0 lanzamientos de ese poder en la cola de regalos, ENTONCES el icono DEBE mostrar una insignia `×N`. **(TikTok)**
5. MIENTRAS el poder esté en enfriamiento, el icono DEBE oscurecerse con un sector que se vacía a medida que termina la recarga.
6. El contador de **usados** (lanzamientos en esta vida, se reinicia al volver a entrar) DEBE seguir la decisión P1 de la tabla de preguntas.
7. La fila DEBE verse igual en la arena horizontal y en el modo vertical 9:16.
8. La fila NO DEBE dibujarse para luchadores fuera de la arena (0 HP).

### HU-FB-02 — Hueco para buffs
**Historia de usuario:** Como desarrollador, quiero un espacio ya reservado para buffs (Kaioken, Súper Saiyajin…), para agregarlos después sin rehacer el diseño.

**Criterios de aceptación**
1. El sistema DEBE reservar, a la derecha de los iconos de poderes y separado por 6 px, un segmento para iconos de buffs que lee una lista `f.buffs` (vacía por ahora).
2. MIENTRAS `f.buffs` esté vacía, el sistema NO DEBE dibujar nada en ese segmento (decisión P2).
3. Cuando exista un buff, su icono DEBE mostrar el tiempo restante con el mismo sector que el enfriamiento.

### HU-FB-03 — Mensaje rojo sobre el luchador
**Historia de usuario:** Como jugador, quiero ver encima de mi guerrero por qué no salió mi poder, para corregir lo que escribí o el regalo que mandé.

**Criterios de aceptación**
1. CUANDO una acción de un luchador que está en la arena sea rechazada, el sistema DEBE mostrar encima de él el texto rojo de la tabla «Mensajes» (rojo `#ff4d4d`, borde oscuro, negrita 13 px).
2. El mensaje DEBE subir unos 20 px y desvanecerse en 1.8 s.
3. El sistema DEBE mostrar como máximo un mensaje rojo por luchador a la vez; uno nuevo reemplaza al anterior.
4. SI el mismo texto se repite para el mismo luchador antes de 1.5 s, ENTONCES el sistema NO DEBE reiniciarlo (evita el spam de letras).
5. El mensaje del chat lateral DEBE seguir apareciendo como hoy (texto largo), además del rojo.
6. SI el luchador no está en la arena, ENTONCES el aviso DEBE quedar solo en el chat (tabla «Solo chat»).

### HU-FB-04 — Enfriamiento y ocupado con motivo propio
**Historia de usuario:** Como jugador, quiero distinguir «todavía recarga» de «está ocupado lanzando otra cosa», para saber cuándo volver a escribir.

**Criterios de aceptación**
1. SI el poder está en enfriamiento, ENTONCES el sistema DEBE mostrar los segundos que faltan con un decimal (M3).
2. SI el luchador está cargando otro poder, ENTONCES el sistema DEBE nombrar ese poder (M4).
3. Estos dos casos DEBEN reemplazar el texto genérico actual «X no disponible ahora.».

### HU-FB-05 — Cola de regalos llena **(TikTok)**
**Criterios de aceptación**
1. SI un regalo llega y la cola del luchador ya tiene `tiktok.maxQueuedPerUser` poderes, ENTONCES el sistema DEBE mostrar M8 y descartar los lanzamientos que no caben (hoy se descartan en silencio).

## Mensajes (texto exacto)

`{poder}` = nombre del poder del catálogo; `{n}` = nivel requerido; `{actual}` = nivel del luchador; `{s}` = segundos con 1 decimal; `{razas}` = razas permitidas; `{max}` = `tiktok.maxQueuedPerUser`.

| # | Caso | Cuándo pasa | Texto rojo sobre el guerrero | Línea en el chat |
|---|---|---|---|---|
| M1 | Nivel insuficiente | Letra de un poder de su raza con nivel menor al requerido | `Nivel insuficiente: {poder} Nv {n}` | `{poder} requiere nivel {n}; tu nivel actual es {actual}.` (igual que hoy) |
| M2 | Raza equivocada | Letra de un poder que su raza no tiene (p. ej. `V` sin ser Freezer) | `{poder}: solo {razas}` | `{poder} solo está disponible para: {razas}.` (igual) |
| M3 | Enfriamiento | Letra de un poder que todavía recarga | `{poder} recargando: {s} s` | `{poder} se recarga en {s} s.` (nuevo; antes «no disponible ahora») |
| M4 | Ocupado | Letra mientras carga o lanza otro poder | `Ocupado: cargando {poder}` | `@{usuario} está lanzando {poder}.` (nuevo) |
| M5 | Poder sin implementar | Regalo o letra de un poder del catálogo sin motor | `{poder}: aún no disponible` | `{poder} todavía no está disponible en combate.` (igual) |
| M6 | Poder desactivado | El admin desactivó ese poder para el personaje | `{poder} desactivado` | `{poder} fue desactivado para este personaje.` (igual) |
| M7 | Regalo bloqueado **(TikTok)** | Regalo de un poder que no puede usar (M1, M2, M5 o M6) | El texto rojo del caso + ` → Ráfaga de Ki` (p. ej. `Nivel insuficiente: Kamehameha Nv 20 → Ráfaga de Ki`) | Motivo + `Se lanza Ráfaga de Ki.` (igual) |
| M8 | Cola llena **(TikTok)** | Regalo con la cola en el máximo | `Cola llena: máx. {max} poderes` | `@{usuario}: cola llena ({max}); se perdieron {k} lanzamientos.` (nuevo) |
| M9 | Sin rival | Golpe o combo (Embestida, Combo Meteoro…) con nadie más en la arena | `Sin rival en la arena` | `@{usuario}: no hay rival para {poder}.` (nuevo; hoy embiste al aire y gasta el enfriamiento) |
| M10 | Regalo sin poder válido **(TikTok)** | El regalo apunta a un `powerCode` que no existe | `Regalo sin poder válido` | `Ese regalo apunta a un poder que no existe.` (igual) |
| M11 | Sin ki | — | **No aplica hoy:** el ki es una estadística de ataque, no una energía que se gasta (ver P3) | — |

### Solo chat (el guerrero no está en la arena)

| Caso | Texto en el chat (igual que hoy) |
|---|---|
| Letra sin haber entrado | `Ingresa a la arena con E antes de usar poderes.` / `@{usuario}: escribe E para entrar a la arena.` |
| Usuario sin jugador creado | `Primero ingresa con E para crear tu jugador en Firebase.` |
| Espera tras 0 HP | `@{usuario} podrá volver en {s} s.` |
| Usuario desactivado | `@{usuario} está desactivado; un operador debe reactivarlo.` |
| Nombre inválido | `El usuario debe tener 3-24 caracteres: letras, números, punto, guion o _.` |

## Preguntas para Pedro

Se aplicó la recomendación de cada una mientras Pedro no diga otra cosa.

| # | Pregunta | Recomendación (aplicada) |
|---|---|---|
| P1 | ¿Qué número muestra cada icono? (a) solo `×N` en cola, (b) en cola + usados en esta vida debajo en gris, (c) usados totales de Firestore (`timesUsed`) | **(b)**: `×N` en la esquina si hay cola y un número gris chiquito con los usados de esta vida |
| P2 | ¿El hueco de buffs se ve vacío (círculo punteado) o invisible hasta que haya buffs? | **Invisible**: no ensucia la pantalla mientras no hay buffs |
| P3 | «Sin ki»: hoy no existe una barra de ki que se gaste. ¿Lo dejamos fuera o abrimos otra HU para energía de ki? | **Fuera** de esta HU; si lo quieres, va en una HU aparte porque cambia el balance y quizá Firestore |
| P4 | M9: ¿bloquear golpes sin rival (no gasta enfriamiento) o dejarlos al aire como hoy? | **Bloquear** con el mensaje rojo |
