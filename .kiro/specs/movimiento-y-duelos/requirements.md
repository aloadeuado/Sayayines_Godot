# Requisitos — Movimiento y duelos cuerpo a cuerpo

## Introducción

Los luchadores se mueven en línea recta y rebotan en los bordes. Cuando dos se acercan, entran en un duelo animado de cuatro golpes alternos con posibilidad de esquiva. El daño físico usa la defensa física con un mínimo garantizado.

## Requisitos

### HU-DUE-01 — Movimiento con rebote
**Historia de usuario:** Como espectador, quiero ver a los luchadores volar por la arena y rebotar, para que la escena siempre tenga acción.

**Criterios de aceptación**
1. El sistema DEBE mover cada luchador vivo con su velocidad `(vx, vy)` y conservar la magnitud al rebotar en los límites del canvas.
2. El sistema NO DEBE usar pathfinding.
3. MIENTRAS un luchador está en duelo o preparando/lanzando un poder, el sistema NO DEBE moverlo.
4. SI queda un solo luchador vivo, ENTONCES el sistema DEBE seguir moviéndolo; no hay fin de partida.

### HU-DUE-02 — Iniciar duelo por proximidad
**Historia de usuario:** Como espectador, quiero que dos luchadores cercanos peleen solos, para que el combate sea automático.

**Criterios de aceptación**
1. CUANDO dos luchadores vivos están a menos de 58 px entre centros y ninguno está en duelo ni cargando Kamehameha, el sistema DEBE iniciar un duelo.
2. El sistema DEBE colocarlos enfrentados a ±38 px de su punto medio, dentro de márgenes del canvas.
3. El sistema NO DEBE disparar poderes automáticamente por proximidad ni al entrar.

### HU-DUE-03 — Secuencia de golpes
**Historia de usuario:** Como espectador, quiero ver golpes y patadas alternados, para entender quién pega a quién.

**Criterios de aceptación**
1. El duelo DEBE ejecutar cuatro pasos en orden izquierda, derecha, izquierda, derecha; cada paso dura 0.4 s y resuelve su golpe a la mitad.
2. En cada paso el sistema DEBE tirar una esquiva con probabilidad `min(0.52, 0.25 + defensaFísica × 0.004)` del defensor.
3. CUANDO el golpe conecta, el sistema DEBE aplicar daño físico bruto `ataqueFísico × 0.95 + aleatorio[0, 3)` y registrar «conecta un golpe … −X HP (Y restantes)».
4. CUANDO el defensor esquiva, el sistema DEBE mostrar la pose de esquiva y registrar la esquiva.
5. CUANDO termina el duelo, el sistema DEBE separar a los luchadores en direcciones opuestas.
6. SI uno de los dos muere, ENTONCES el sistema DEBE terminar el duelo.

### HU-DUE-04 — Daño con mitigación
**Historia de usuario:** Como jugador, quiero que la defensa reduzca el daño pero nunca lo anule, para que todo golpe cuente.

**Criterios de aceptación**
1. El sistema DEBE calcular `daño = max(4, bruto − defensa × 0.45)`, con defensa física para golpes y defensa de ki para poderes.
2. CUANDO el HP llega a 0, el sistema DEBE marcar `alive false`, sumar `deaths`, guardar el perfil y, si hay atacante distinto, registrar el evento `knockout` (`victim`, `killer`, más `id`, `reference` completa, `victimRef` y `killerRef` como referencias completas a los jugadores del mismo entorno, `isActive true`) y otorgar XP (ver `progresion-rpg`).

### HU-DUE-05 — Interrumpir duelo con un poder
**Historia de usuario:** Como jugador, quiero poder lanzar un poder aunque esté en un duelo, para no quedar bloqueado.

**Criterios de aceptación**
1. CUANDO un luchador en duelo lanza `V`, `M` o `K` permitido, el sistema DEBE terminar ese duelo antes de iniciar la preparación.
