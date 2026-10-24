# Requisitos — Progresión RPG (nivel, atributos, XP)

## Introducción

Cada perfil tiene un nivel `N` entre 1 y 100 guardado en Firestore. Todos los atributos de combate se derivan de `N` y de multiplicadores configurables por entorno. Las bajas dan XP y la XP sube de nivel.

## Requisitos

### HU-RPG-01 — Atributos derivados del nivel
**Historia de usuario:** Como administrador, quiero que los atributos salgan de una fórmula por nivel, para balancear todo desde Settings.

**Criterios de aceptación**
1. El sistema DEBE limitar `N` a enteros entre 1 y 100.
2. El sistema DEBE calcular, con `g = N − 1`: HP `100 + M_hp·g`, Ataque físico `9 + M_fis·g`, Defensa física `5 + M_defFis·g`, Ataque de ki `12 + M_ki·g`, Defensa de ki `5 + M_defKi·g`.
3. Los defaults DEBEN ser `M_hp 8`, `M_fis 1.35`, `M_defFis 0.7`, `M_ki 1.4`, `M_defKi 0.8`.
4. El sistema NO DEBE guardar los atributos derivados como campos independientes (solo `hp` actual y `maxHp` de referencia).
5. Arena, Bot y Settings DEBEN usar la misma función `calculateLevelStats`.

### HU-RPG-02 — Ganar XP por baja
**Historia de usuario:** Como jugador, quiero ganar XP al derrotar a alguien, para subir de nivel.

**Criterios de aceptación**
1. CUANDO un luchador derrota a otro, el sistema DEBE sumarle `100 + round(nivelRival × 4)` XP y `kills + 1`.
2. El sistema DEBE requerir `round(100 + 24L + 1.3L²)` XP para pasar del nivel `L` al siguiente.
3. CUANDO la XP alcanza el requisito, el sistema DEBE consumirlo, subir de nivel (varias veces si alcanza), recalcular atributos, sumar al HP actual el aumento de HP máximo y anunciar «sube al nivel N».
4. CUANDO el nivel llega a 100, el sistema DEBE fijar `xp = 0`.
5. El sistema DEBE guardar el perfil tras cada ganancia.

### HU-RPG-03 — Nivel real desde Firestore
**Historia de usuario:** Como operador, quiero ver el nivel guardado, para confiar en el progreso.

**Criterios de aceptación**
1. El sistema DEBE leer `level` y `xp` del documento y NO DEBE inferir nivel a partir de bajas o del nombre.
2. SI la lectura falla, ENTONCES el sistema DEBE mostrar el error y NO DEBE crear perfiles de reemplazo ni sobrescribir con defaults.

### HU-RPG-04 — Cambio de fórmula sin perder porcentaje de vida
**Historia de usuario:** Como administrador, quiero cambiar fórmulas sin dejar a nadie con vida rota.

**Criterios de aceptación**
1. CUANDO se aplican nuevos multiplicadores a luchadores en memoria, el sistema DEBE conservar su porcentaje de HP.
2. CUANDO se carga un perfil con `hpFormulaVersion < 2`, el sistema DEBE migrar su HP proporcionalmente desde la escala antigua `100 + 4g` a la actual.
3. **Limitación:** la arena lee Settings solo al arrancar; un cambio guardado en `/settings` se aplica al recargar `/`.

### HU-RPG-05 — Inspeccionar atributos
**Historia de usuario:** Como operador, quiero ver nivel, XP, bajas, atributos y poderes desbloqueados del luchador seleccionado.

**Criterios de aceptación**
1. CUANDO se selecciona un perfil, el sistema DEBE mostrar nivel, `xp / xpForNext`, victorias, caídas y los cinco atributos derivados.
2. El sistema DEBE listar solo los poderes desbloqueados para su raza y nivel.

### HU-RPG-06 — Características por raza · IMPLEMENTADO (2026-10-24)
**Historia de usuario:** Como administrador, quiero que cada raza tenga sus propios multiplicadores de ki, daño físico, defensa física y defensa de ki, para que las razas se sientan distintas.

**Criterios de aceptación**
1. `calculateLevelStats` DEBE multiplicar ki, ataque físico, defensa física y defensa de ki por `stats.*` de la raza del personaje (`kiArenaRaces`); la vida (`hp`) sigue siendo global.
2. Valores iniciales:

| Raza | Ki | Daño físico | Def. física | Def. ki |
|---|---|---|---|---|
| Saiyajin | 1.10 | 1.20 | 0.95 | 0.90 |
| Namekuseijin | 1.05 | 0.95 | 1.10 | 1.10 |
| Terrícola | 0.95 | 1.00 | 1.00 | 1.00 |
| Freezer | 1.25 | 0.95 | 0.95 | 1.05 |

3. SI la raza no se puede leer, ENTONCES el sistema DEBE usar 1.0 en todos los multiplicadores.
4. **Pregunta abierta:** se propone multiplicar sobre los multiplicadores globales de settings, no reemplazarlos.

### HU-RPG-07 — Utilidad por raza · IMPLEMENTADO (2026-10-24)
**Historia de usuario:** Como jugador, quiero que mi raza tenga una habilidad especial, para tener una ventaja propia.

**Criterios de aceptación**
1. Cada raza DEBE tener una utilidad con variables editables en `utility.params`:

| Raza | Utilidad | Qué hace | Variables (por defecto) |
|---|---|---|---|
| Saiyajin | Zenkai | Cada derrota da un bono permanente a sus stats, con tope | `bonusPerDefeat 0.03`, `maxBonus 0.15` |
| Namekuseijin | Regeneración | Fuera de combate recupera un % de la vida máxima por segundo | `regenPerSecond 0.02`, `outOfCombatSeconds 3` |
| Terrícola | Ingenio | Gana más XP y puede esquivar golpes | `xpBonus 0.20`, `dodgeChance 0.08` |
| Freezer | Transformación | Con poca vida gana más daño un tiempo, una vez por vida | `hpThreshold 0.30`, `damageBonus 0.25`, `durationSeconds 8` |

2. Lo acumulado por la utilidad (p. ej. `zenkaiBonus`) DEBE guardarse en `kiArenaPlayers.utilityState`.
3. CUANDO cambia un parámetro en settings, el sistema DEBE aplicarlo sin reiniciar la arena.
