# Requisitos — Integración con TikTok Live · FASE 1 IMPLEMENTADA (2026-11-10)

> **Estado:** Pedro aprobó la HU y los cambios de modelo el 2026-11-10. HU-TT-01 a 05 y 07 a 10 están implementadas en `feature/tiktok-live` y probadas con eventos simulados (falta un live real). La fase 2 (HU-TT-06, rayos nuevos y Genkidama) también quedó implementada el mismo día.

> **Rutas Firestore (obligatorio):** todo modelo de este módulo vive en `environments/{APP_ENV}/{colección}/{id}`. Ver `.kiro/steering/reglas-datos.md`. Los cambios de modelo de `design.md` § «Cambios de modelo» los aprobó Pedro el 2026-11-10 (1 y 3; el 2 solo con `username`).

## Introducción

Pedro transmite Ki Arena en TikTok Live. Los espectadores del live deben poder jugar sin salir de TikTok: escribir `e` en el chat los mete a la arena, cada like cura a su guerrero y cada regalo lanza un poder. Todo corre en la máquina de Pedro, dentro de la app de escritorio (Electron + servidor local), sin Cloud Functions ni servidores de terceros propios.

Pedido original (Pedro, 2026-11-10, dictado por voz):

| # | Pedido | HU |
|---|---|---|
| 1 | Escribir «e» o «E» en el chat del live entra a la arena con un guerrero con el nombre de la cuenta de TikTok | HU-TT-02 |
| 2 | Cada like cura 1 punto de vida | HU-TT-03 |
| 3 | Cada poder se asocia a un regalo: poderes simples = regalos de 1 moneda, poderes buenos = 10 a 20 monedas, León = Genkidama. Los poderes se siguen liberando por nivel; solo un poder sencillo de una mano (Rosa) lo puede lanzar cualquiera (aclaración 2026-11-10) | HU-TT-04, HU-TT-05, HU-TT-10 |
| 4 | Poderes cuerpo a cuerpo y combos largos con la misma frecuencia que los de ki | HU-TT-06 |
| 5 | Quien se queda sin HP sale del tablero y puede volver a entrar con «e» después de 10 s (aclaración 2026-11-10) | HU-TT-07 |
| 6 | Todo en su propio servidor (local) | HU-TT-01 |

## Requisitos

### HU-TT-01 — Conectar la app de escritorio a un TikTok Live
**Historia de usuario:** Como streamer, quiero conectar la app de escritorio a mi live escribiendo mi @usuario, para que la arena reciba el chat, los likes y los regalos sin servidores externos míos.

**Criterios de aceptación**
1. La app de escritorio DEBE tener un menú «TikTok Live» con «Conectar / estado…» (abre el panel `/tiktok`, donde se escribe el @usuario y se ve el estado: desconectado, conectando, conectado, no está en vivo, live terminado, reconectando, error) y «Desconectar».
2. El receptor DEBE correr en el proceso principal de Electron, en la máquina del streamer, y funcionar igual en Windows y macOS.
3. El @usuario DEBE guardarse en las preferencias locales del escritorio (`preferencias.json` en la carpeta de datos de la app), no en Firestore, y DEBE reconectarse solo al abrir la app si estaba conectado.
4. SI la conexión se corta o el live termina, ENTONCES el sistema DEBE reintentar con espera creciente (5 s, 10 s, 20 s… hasta 60 s) y mostrar el estado en el panel `/tiktok`.
5. El receptor NO DEBE pedir ni guardar la contraseña ni tokens de la cuenta de TikTok.
6. La arena DEBE mostrar una marca pequeña «TikTok conectado: @usuario» solo MIENTRAS haya una conexión real activa (sustituye a HU-TT-02 anterior de la simulación).

### HU-TT-02 — Entrar escribiendo «e» en el chat del live
**Historia de usuario:** Como espectador del live, quiero escribir `e` en el chat, para que aparezca un guerrero con mi nombre de TikTok.

**Criterios de aceptación**
1. CUANDO llega un comentario cuyo texto, sin espacios, es `e` o `E`, el sistema DEBE ejecutar la entrada (HU-ENT-01/03) para ese espectador.
2. El ID del jugador DEBE ser `tiktok_{userId}` (ID numérico estable de TikTok), como ya fija `reglas-datos.md`, para que cambiar de @usuario no cree otro guerrero.
3. El nombre visible DEBE ser el @usuario (`uniqueId`) de la cuenta; SI no cumple `[A-Za-z0-9_.-]{3,24}`, ENTONCES el sistema DEBE limpiarlo (quitar caracteres no válidos y recortar a 24) en lugar de rechazar la entrada.
4. Los demás comandos de una letra (`K`, `M`, `V`, `B`) escritos en el chat de TikTok DEBEN seguir las mismas reglas de nivel, raza y enfriamiento que el chat normal.
5. Los comentarios que no son comandos DEBEN mostrarse en el chat de la arena como mensajes de TikTok, sin ejecutarse ni guardarse en Firestore. Los comandos y regalos sí se guardan y `/bot` los muestra marcados «TikTok».

### HU-TT-03 — Cada like cura 1 punto de vida
**Historia de usuario:** Como espectador, quiero que mis likes curen a mi guerrero, para ayudarlo a sobrevivir.

**Criterios de aceptación**
1. CUANDO llega un evento de like de un espectador cuyo guerrero está vivo en la arena, el sistema DEBE sumarle `likeCount × likeHealHp` de vida (por defecto 1 HP por like), sin pasar de `maxHp`.
2. SI el espectador no tiene guerrero vivo en la arena, ENTONCES el like NO DEBE hacer nada (no revive ni crea guerrero).
3. El sistema DEBE mostrar un «+N» verde sobre el guerrero curado, agrupando los likes que lleguen en el mismo segundo.
4. Los likes NO DEBEN guardarse uno por uno en Firestore; la vida se guarda con el guardado normal del guerrero.

### HU-TT-04 — Cada regalo lanza un poder
**Historia de usuario:** Como espectador, quiero que mi regalo haga que mi guerrero lance un poder, para que regalar se vea en pantalla.

**Criterios de aceptación**
1. El sistema DEBE mapear cada regalo explícitamente a un `code` de poder (tabla de `design.md`); un regalo sin mapa NO DEBE lanzar nada, pero DEBE mostrarse en el chat como agradecimiento.
2. SI quien regala no tiene guerrero en la arena, ENTONCES el sistema DEBE meterlo primero (como con `e`) y después lanzar el poder.
3. Un poder pagado con regalo DEBE respetar el nivel de desbloqueo y la raza, igual que con letra (Pedro, 2026-11-10). La única excepción es la Ráfaga de Ki de una mano (HU-TT-10), que cualquiera puede lanzar.
3b. SI el poder del regalo está bloqueado para ese guerrero, ENTONCES el sistema DEBE lanzar la Ráfaga de Ki en su lugar y avisar en el chat el motivo (p. ej., «Kamehameha requiere nivel 20; se lanzó Ráfaga de Ki»), para que el regalo no se pierda.
4. El enfriamiento NO DEBE aplicarse a los poderes pagados con regalo; con letra (`K`, `M`, `V`, `B`) sí aplica. MIENTRAS el guerrero prepara o lanza otro poder, el regalo DEBE quedar en cola (máximo 5 por espectador).
5. CUANDO un regalo llega en racha (`repeatCount`), el sistema DEBE contar solo el final de la racha (`repeatEnd`) y encolar un lanzamiento por unidad, hasta el máximo de la cola.
6. CUANDO el guerrero está muerto, SI ya pasó su espera de HU-TT-07 el regalo DEBE reingresarlo y lanzar el poder; SI no, el regalo DEBE quedar en cola y lanzarse cuando vuelva a entrar.
7. Cada regalo procesado DEBE guardarse como mensaje con ID `tiktok_{msgId}` (deduplicación) y `playerRef` al guerrero.

### HU-TT-05 — Escala de regalos según su valor
**Historia de usuario:** Como streamer, quiero que los regalos baratos lancen poderes simples y los caros poderes fuertes, para que valga la pena regalar más.

**Criterios de aceptación**
1. Los regalos de 1 moneda DEBEN lanzar poderes simples; la Rosa DEBE lanzar la Ráfaga de Ki de una mano (HU-TT-10).
2. Los regalos de 10 a 20 monedas DEBEN lanzar poderes buenos.
3. El León DEBE lanzar la Genkidama.
4. El mapa DEBE poder editarse sin tocar código (dónde se guarda: decisión de Pedro, ver `design.md`).

### HU-TT-06 — Cuerpo a cuerpo y combos con la misma frecuencia · IMPLEMENTADO (fase 2)
**Historia de usuario:** Como espectador, quiero ver golpes y combos largos tan seguido como rayos de ki, para que la pelea se vea variada.

**Criterios de aceptación**
1. En cada escalón de valor del mapa de regalos DEBE haber la misma cantidad de poderes cuerpo a cuerpo (`physical`) que de ki.
2. Un poder cuerpo a cuerpo DEBE acercar al guerrero al rival más cercano del lado al que mira y golpearlo `hits` veces (combo), con daño físico por golpe.
3. Los combos largos DEBEN tener al menos 4 golpes y verse con las poses de golpe existentes (`fighter-melee-poses-v1.png`).

### HU-TT-07 — Volver a entrar después de 10 segundos
**Historia de usuario:** Como streamer, quiero que quien se queda sin vida espere un momento para volver, para que nadie reaparezca sin pausa.

**Criterios de aceptación**
1. CUANDO un guerrero llega a 0 HP, el sistema DEBE sacarlo del tablero, guardar la hora y rechazar su `e` durante `rejoinCooldownSeconds` (10 s por defecto) con «@usuario podrá volver en N s». No hay botón para sacar jugadores (Pedro, 2026-11-10).
2. Pasado ese tiempo, `e` DEBE reingresarlo con su progreso (HU-ENT-03).
3. La regla DEBE aplicar igual a TikTok y al chat normal.

### HU-TT-08 — Simulación en el panel `/tiktok`
**Historia de usuario:** Como streamer, quiero probar los regalos y likes sin estar en vivo, para ensayar antes de transmitir.

**Criterios de aceptación**
1. El panel `/tiktok` DEBE ofrecer un simulador con: comentario de un usuario, N likes y un regalo de la lista mapeada (o uno sin mapa), con cantidad de racha.
2. Los eventos simulados DEBEN pasar por el mismo camino que los reales y llevar la marca «simulado» en el chat.
3. La UI NO DEBE decir que TikTok está conectado por usar la simulación.

### HU-TT-09 — Seguridad y límites
**Criterios de aceptación**
1. El sistema DEBE deduplicar por ID de evento de TikTok y descartar repeticiones.
2. El sistema DEBE limitar a 20 poderes por segundo en toda la arena; lo que exceda espera en la cola.
3. Las rutas DEBEN salir de `APP_ENV` (`dev|qa|prd`); conectar contra `prd` DEBE pedir confirmación como el resto del escritorio.
4. El texto del chat de TikTok DEBE tratarse como texto plano (sin HTML) en la arena y en `/bot`.

### HU-TT-10 — Ráfaga de Ki de una mano (poder de la Rosa)
**Historia de usuario:** Como espectador nuevo, quiero lanzar un poder sencillo desde el nivel 1 regalando una Rosa, para participar aunque mi guerrero sea débil.

**Criterios de aceptación**
1. La Ráfaga de Ki (`kiBlast`, comando `B`, ya en el catálogo con nivel 1 para todas las razas) DEBE tener mecánica propia: el guerrero extiende una sola mano y dispara una esfera pequeña de ki recta hacia donde mira.
2. La animación DEBE ser de una mano: preparación corta (≈0.2 s) con la mano extendida y disparo, distinta de la pose a dos manos del Kamehameha.
3. Con letra `B` DEBE respetar su enfriamiento (2.5 s); con Rosa NO.
4. Es el poder de reemplazo cuando un regalo pide un poder bloqueado (HU-TT-04.3b).

## Respuestas de Pedro (2026-11-10)

| # | Pregunta | Respuesta |
|---|---|---|
| P1 | ¿Qué seguía después de «Para…»? | Nada |
| P2 | ¿Quién sale del tablero? | Solo quien se queda sin HP; vuelve con «e» después de 10 s |
| P3 | ¿El regalo ignora nivel y raza? | No: los poderes se liberan por nivel. Solo un poder sencillo de una mano (Rosa) es para todos. Con regalo no hay enfriamiento; con letra sí |
| P4 | ¿Un muerto que regala antes de tiempo? | El poder queda en cola hasta que vuelva (espera de 10 s) |

| P5 | ¿Cambios de modelo? | Aprobados 1 (Settings) y 3 (mensajes); el 2 solo con `username` |
| P6 | Regalo de un poder bloqueado | Lanza la Ráfaga de Ki y avisa el motivo (implementado así; Pedro dijo «procede») |

## Preguntas abiertas

| # | Pregunta | Propuesta por defecto |
|---|---|---|
| P7 | ¿Qué regalos de ≈10–20 monedas lanzan Galick Ho, Puño del Lobo y Puño del Dragón? | Elegir de la lista del panel `/tiktok` |
