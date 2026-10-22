# Diseño — Movimiento y duelos

## Estado por luchador (en memoria, `game/arena.js`)

`x, y, vx, vy, hp, max, atk, def, ki, kidef, alive, combatState{duel, frame}, kameState, makaState, deathRayState, kameCd, makaCd, deathCd, flash`.

## Bucle `update(dt)`

1. `updateDuels(dt)`.
2. Para cada luchador vivo: reducir cooldowns y `flash`; si está en duelo, saltar; si tiene estado de poder, avanzar su máquina de fases y saltar; si no, mover y rebotar.
3. Rebote en `x ∈ [26, W−26]`, `y ∈ [55, H−56]`. Con el enemigo más cercano `e = nearest(f)`: si está a menos de 58 px y no tiene `combatState` ni `kameState` → `startDuel(f, e)`.
4. Avanzar `bolts` (ver `poderes-ki`) y partículas.

## Duelo

```text
duel = { left, right, steps:[L→R f1, R→L f1, L→R f2, R→L f2], index, timer, hitDone }
cada paso: duration 0.4 s; a la mitad → esquiva? (pose 3) : hit(defensor, atk × 0.95 + random(0..3), atacante, ki=false)
fin: endDuel → left.vx = −|vx|, right.vx = +|vx|
```

`hit(target, amount, source, ki)` centraliza mitigación, partículas, muerte, `saveFighter`, evento `knockout` y `gain` de XP. Es el único punto donde se aplica daño: los poderes también lo usan.

## Constantes relevantes

| Constante | Valor | Dónde |
|---|---|---|
| Distancia de duelo | 58 px | `update` |
| Separación en duelo | ±38 px | `startDuel` |
| Duración de paso | 0.4 s | `updateDuels` |
| Esquiva máx. | 52 % | `updateDuels` |
| Daño mínimo | 4 | `hit` |
| Factor de defensa | 0.45 | `hit` |

Si se vuelven configurables, deben pasar a `gameplay-settings.js` y a Settings.
