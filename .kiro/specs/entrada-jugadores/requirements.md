# Requisitos — Entrada de jugadores e identidad (`E`)

## Introducción

Un espectador entra a la arena con el comando `E`. Su nombre normalizado es su identidad única; la primera vez recibe una raza al azar entre las habilitadas y nivel 1, y en reingresos conserva su progreso de Firestore.

## Requisitos

### HU-ENT-01 — Entrar por primera vez
**Historia de usuario:** Como espectador, quiero escribir `E` para crear mi luchador, para participar en la arena.

**Criterios de aceptación**
1. CUANDO llega `E` de un nombre sin perfil, el sistema DEBE crear el documento `kiArenaPlayers/{usernameKey}` con `id = usernameKey`, `reference` = referencia completa `…/environments/{APP_ENV}/kiArenaPlayers/{usernameKey}`, `isActive true`, `level 1`, `xp 0`, `kills 0`, `deaths 0`, `alive true`, `hp 100`, `maxHp 100`, `hpFormulaVersion 2`.
2. El sistema DEBE sortear la raza solo entre las razas habilitadas en Settings (`enabledCharacterRaces`).
3. SI no hay ninguna raza habilitada, ENTONCES el sistema DEBE rechazar la entrada con «No hay personajes habilitados para crear un usuario nuevo.» y no crear el perfil.
4. El sistema DEBE agregar el luchador a la arena cerca del centro con velocidad aleatoria.

### HU-ENT-02 — Nombre válido y único
**Historia de usuario:** Como operador, quiero que cada nombre sea único sin importar mayúsculas, para que nadie suplante o duplique a otro.

**Criterios de aceptación**
1. El sistema DEBE aceptar solo nombres de 3 a 24 caracteres `[A-Za-z0-9_.-]`; SI no cumple, ENTONCES DEBE rechazarlo con un mensaje del sistema.
2. El sistema DEBE usar `usernameKey = trim().toLowerCase()` como ID de documento.
3. SI el luchador con esa clave ya está vivo en la arena, ENTONCES el sistema DEBE responder «ya está dentro; no se creó un duplicado» sin crear luchador ni mensaje nuevo.
4. MIENTRAS una entrada del mismo nombre está en curso (`joiningUsers`), el sistema DEBE ignorar otra `E` de ese nombre.
5. El sistema DEBE mostrar el `username` guardado (canónico) aunque la persona escriba otra capitalización.

### HU-ENT-03 — Reingresar conservando progreso
**Historia de usuario:** Como jugador que fue derrotado, quiero volver con `E`, para seguir con mi nivel, XP, raza y bajas.

**Criterios de aceptación**
1. CUANDO llega `E` de un perfil con `alive false`, el sistema DEBE marcarlo vivo, restaurar `hp` al máximo de su nivel y guardar.
2. El sistema NO DEBE volver a sortear la raza ni cambiar `level`, `xp`, `kills` o `deaths`.
3. CUANDO el luchador aún existe en memoria muerto, el sistema DEBE reutilizarlo, reiniciar cooldowns y estados de poder, y anunciar «vuelve a la arena con su progreso de Firebase».

### HU-ENT-04 — El comando se registra una sola vez
**Historia de usuario:** Como operador, quiero que una `E` aparezca una sola vez en el chat, para que el registro no se llene de repeticiones.

**Criterios de aceptación**
1. CUANDO la arena procesa una `E` remota, el sistema NO DEBE volver a publicar el mensaje `E`.
2. CUANDO la arena publica una `E` local, el sistema DEBE marcar el ID del mensaje como visto para no reprocesarlo.
3. CUANDO se abre la arena, los mensajes históricos DEBEN mostrarse como historial sin ejecutar sus comandos.

### HU-ENT-05 — Cargar perfiles vivos al abrir
**Historia de usuario:** Como operador, quiero que al abrir la arena aparezcan los perfiles que estaban vivos, para no perder la partida al recargar.

**Criterios de aceptación**
1. CUANDO arranca la arena, el sistema DEBE crear un luchador por cada perfil con `alive !== false`, en una grilla de 5 columnas.
2. El sistema NO DEBE crear luchadores CPU de relleno.
3. El sistema NO DEBE reescribir perfiles como efecto de la carga.

## Limitaciones conocidas
- Una `E` enviada desde `/bot` mientras ninguna arena está abierta queda solo como mensaje histórico: no se ejecuta al abrir la arena (criterio 4.3).
- No hay transacciones: dos arenas abiertas pueden crear/guardar el mismo perfil a la vez.

### HU-ENT-06 — Perfiles desactivados (borrado suave)
**Historia de usuario:** Como operador, quiero poder «eliminar» un perfil sin perder su historia, para retirarlo de la arena y poder recuperarlo después.

**Criterios de aceptación**
1. CUANDO se elimina un perfil, el sistema DEBE marcar `isActive=false` y NO DEBE borrar el documento.
2. SI llega `E` de un perfil con `isActive=false`, ENTONCES el sistema NO DEBE crear otro perfil con la misma clave ni reactivarlo solo; DEBE responder que el perfil está desactivado.
3. La arena y el roster NO DEBEN mostrar perfiles con `isActive=false`.
4. Reactivar un perfil DEBE ser una acción explícita del operador (`isActive=true`).

### HU-ENT-07 — Crear personaje desde el catálogo · PROPUESTA (Pedro, 2026-10-24)
**Historia de usuario:** Como jugador, quiero que al entrar se me cree un personaje a partir del catálogo, para que los personajes nuevos aparezcan sin cambiar código.

**Criterios de aceptación**
1. CUANDO se crea un personaje nuevo, el sistema DEBE elegir al azar un tipo de `kiArenaPlayerTypes` con `isActive !== false` e `isEligible !== false`, y guardar `playerTypeRef`.
2. SI el usuario tiene cuenta, ENTONCES el personaje DEBE guardar `userRef` y añadirse a `playerRefs` del usuario; si no tiene `primaryPlayerRef`, este pasa a ser el principal.
3. CUANDO un usuario con varios personajes entra desde el chat, el sistema DEBE usar su `primaryPlayerRef` (pregunta abierta: o elegir con un comando).
