# Requisitos — Settings de juego (`/settings`)

## Introducción

Pantalla de administración separada del stream para editar multiplicadores de atributos, curvas de daño por poder y razas elegibles. Se guarda por entorno en Firestore.

## Requisitos

### HU-SET-01 — Editar multiplicadores de atributos
**Historia de usuario:** Como administrador, quiero editar `M_hp`, `M_ki`, `M_fis`, `M_defFis`, `M_defKi`, para balancear el juego sin programar.

**Criterios de aceptación**
1. El sistema DEBE mostrar cada multiplicador con su fórmula y valor actual.
2. CUANDO se guarda, el sistema DEBE normalizar cada valor numérico al rango `[0, 100]` y usar el default si no es numérico.

### HU-SET-02 — Editar curvas de poderes
**Historia de usuario:** Como administrador, quiero definir el multiplicador de cada poder en nivel 1 y nivel 100, para controlar su crecimiento.

**Criterios de aceptación**
1. El sistema DEBE mostrar dos grupos: «Razas distintas de Freezer» (Kamehameha, Makankosappo) y «Freezer» (Rayo Mortal, Makankosappo, Kamehameha), cada uno con su requisito de desbloqueo.
2. SI alguna curva no crece de nivel 1 a nivel 100, ENTONCES el sistema DEBE rechazar con «Cada multiplicador debe crecer desde nivel 1 hasta nivel 100.».
3. SI en el grupo genérico Makankosappo no supera a Kamehameha en ambos extremos, ENTONCES DEBE rechazar.
4. SI en Freezer no se cumple Rayo Mortal < Makankosappo < Kamehameha en ambos extremos, ENTONCES DEBE rechazar.
5. El sistema DEBE listar los poderes del catálogo pendientes sin controles de combate.

### HU-SET-03 — Razas elegibles
**Historia de usuario:** Como administrador, quiero activar o desactivar razas, para controlar qué personajes reciben los nuevos jugadores.

**Criterios de aceptación**
1. El sistema DEBE listar Goku·Saiyajin, Piccolo·Namekuseijin, Gohan·Humano y Freezer·Freezer con un checkbox.
2. SI ninguna está activa, ENTONCES el sistema DEBE rechazar con «Activa al menos un personaje elegible.».
3. Desactivar una raza NO DEBE modificar perfiles existentes; solo afecta al sorteo de perfiles nuevos.

### HU-SET-04 — Persistencia por entorno
**Historia de usuario:** Como administrador, quiero que `dev`, `qa` y `prd` tengan ajustes separados (`environments/{APP_ENV}/kiArenaSettings/gameplay`), para probar sin afectar producción.

**Criterios de aceptación**
1. El sistema DEBE leer y escribir solo `environments/{APP_ENV}/kiArenaSettings/gameplay`, con `APP_ENV` = `dev|qa|prd`.
2. SI el documento no existe, ENTONCES el sistema DEBE usar los defaults del código.
3. CUANDO se cambia el selector de entorno (si se conserva), el sistema DEBE recargar con `?env=` aceptando solo `dev|qa|prd`.
4. **Restaurar** DEBE guardar los defaults normalizados en el entorno actual.
5. El sistema DEBE informar éxito o error de carga/guardado en `#settings-status`.
6. El documento de ajustes DEBE tener `id = gameplay`, `reference` = referencia completa `…/environments/{APP_ENV}/kiArenaSettings/gameplay` e `isActive`; SI `isActive=false`, ENTONCES el sistema DEBE usar los defaults.
