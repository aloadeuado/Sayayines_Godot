# Requisitos — Ráfaga de Ki (`B`) · PENDIENTE

> **Estado:** no está en el repositorio. El contexto de Pedro (`KiArena/contexto-proyecto/`) indica que existe como cambio local sin commit en la rama `separate`. Antes de implementar desde cero, pedir a Pedro ese trabajo local para no duplicarlo.

## Introducción

Primer poder universal: un haz simple cian/blanco disparado con una mano, disponible para todas las razas desde nivel 5. Llena el hueco entre la entrada (nivel 1) y Makankosappo (nivel 10).

## Requisitos

### HU-B-01 — Desbloqueo
**Historia de usuario:** Como jugador de nivel bajo, quiero un primer poder en nivel 5, para tener algo que lanzar antes de Makankosappo.

**Criterios de aceptación**
1. El sistema DEBE permitir `B` a todas las razas desde nivel 5.
2. SI el nivel es menor que 5, ENTONCES el sistema DEBE rechazar con «Ráfaga de Ki requiere nivel 5; tu nivel actual es N.» en Bot y en arena.

### HU-B-02 — Animación y forma
**Historia de usuario:** Como espectador, quiero ver la preparación y el haz, para distinguirlo de los otros poderes.

**Criterios de aceptación**
1. El sistema DEBE mostrar preparación con pose de mano extendida y aura de carga, con el luchador quieto.
2. El sistema DEBE dibujar un haz horizontal cian/blanco en la dirección de `vx`.
3. La anchura DEBE escalar con el nivel y el radio de impacto DEBE derivarse de esa misma anchura.

### HU-B-03 — Daño configurable
**Historia de usuario:** Como administrador, quiero configurar su curva, para balancearlo con el resto.

**Criterios de aceptación**
1. El daño bruto DEBE ser `AtaqueKi(N) × M_B(N)` y aplicarse contra defensa de ki.
2. Settings DEBE mostrar la curva de `B` (nivel 1 y nivel 100) y su requisito.
3. Settings DEBE validar que la curva de `B` crece y queda por debajo de Makankosappo.
4. Un rayo `B` DEBE dañar una sola vez a cada objetivo que atraviese.

### HU-B-04 — Coherencia del flujo
**Criterios de aceptación**
1. `B` DEBE aparecer como atajo en `/bot`, en la ayuda de `/`, en `PROJECT_SPEC.md` y en `arena-cloud.js` (`command`).
2. `B` DEBE tener cooldown propio y respetar la exclusión con otros poderes.
