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
