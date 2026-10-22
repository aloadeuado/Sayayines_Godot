# Requisitos — Panel de operador (`/bot`)

## Introducción

Ventana separada del stream donde el operador simula el chat, elige el remitente, hace ingresar jugadores y ve métricas y el registro de combate. Escribe mensajes en Firestore; la arena los consume.

## Requisitos

### HU-BOT-01 — Enviar comandos como un usuario
**Historia de usuario:** Como operador, quiero escribir un mensaje o pulsar `E`, `K`, `M`, `V` como cierto usuario, para simular el chat.

**Criterios de aceptación**
1. SI el usuario no cumple 3–24 `[A-Za-z0-9_.-]`, ENTONCES el sistema DEBE mostrar el error y no enviar.
2. CUANDO el mensaje es `K`, `M` o `V`, el sistema DEBE leer el perfil y rechazar si no existe («debe ingresar con E…») o si `powerBlockReason` devuelve motivo.
3. CUANDO se acepta, el sistema DEBE guardar el mensaje en `kiArenaMessages`, limpiar el campo de mensaje, mostrar «Comando … enviado» y refrescar chat y roster.
4. Enter en el campo de mensaje DEBE equivaler a **Enviar**.

### HU-BOT-02 — Chat legible
**Historia de usuario:** Como operador, quiero ver los últimos mensajes sin spam de entradas repetidas.

**Criterios de aceptación**
1. El sistema DEBE mostrar los últimos 50 mensajes en orden cronológico y refrescarlos cada 2.5 s.
2. El sistema DEBE mostrar solo la `E` más reciente de cada usuario.
3. El sistema DEBE resaltar como comando los mensajes `E/K/M/V` y escapar HTML.

### HU-BOT-03 — Roster interactivo
**Historia de usuario:** Como operador, quiero una lista de todos los perfiles con su estado, para operar sin mirar la arena.

**Criterios de aceptación**
1. El sistema DEBE listar cada perfil con color de raza, raza, nivel, bajas, HP/HPmáx, XP/requisito, KOs y barra de HP; refrescar cada 4 s.
2. **Elegir** DEBE fijar ese nombre como remitente del chat sin cambiar la selección de inspección.
3. **Ingresar** DEBE enviar `E` por ese usuario; DEBE estar deshabilitado («Dentro») si el perfil tiene `alive true`.
4. **Agregar todos** DEBE enviar `E` por cada perfil con `alive false`; SI no hay, ENTONCES informar «No hay luchadores pendientes ni eliminados.».
5. CUANDO se hace clic en la fila, el sistema DEBE seleccionarla para inspección.

### HU-BOT-04 — Métricas y feed
**Historia de usuario:** Como operador, quiero un resumen y el registro de combate, para narrar el stream.

**Criterios de aceptación**
1. El sistema DEBE mostrar total de luchadores, vivos, KOs acumulados (suma de `deaths`) y nivel más alto.
2. El sistema DEBE mostrar los atributos derivados del perfil seleccionado (ver `progresion-rpg`).
3. El sistema DEBE mostrar los últimos 30 eventos de `kiArenaEvents` cada 4 s; SI la consulta falla, ENTONCES mostrar lista vacía sin romper la vista.

### HU-BOT-05 — Estado de conexión
**Historia de usuario:** Como operador, quiero saber si el panel está conectado y a qué entorno.

**Criterios de aceptación**
1. CUANDO cargan chat, roster y feed, el sistema DEBE mostrar «Conectado con Firestore · ENV · chat, roster y métricas listos.».
2. SI falla, ENTONCES DEBE mostrar «Firebase no disponible: …».
3. El selector de entorno (si se conserva) DEBE recargar con `?env=` y aceptar solo `dev|qa|prd`.

## Limitaciones conocidas
- «Dentro» refleja el campo `alive` de Firestore, no si una arena está abierta.
- `/bot` no ejecuta combate: sin una arena `/` abierta, los comandos solo quedan guardados.

### HU-BOT-06 — Registros activos y borrado suave
**Historia de usuario:** Como operador, quiero que el panel muestre solo registros activos y que «eliminar» nunca borre datos.

**Criterios de aceptación**
1. Roster, chat y feed DEBEN ignorar registros con `isActive=false`.
2. CUANDO el operador elimina un perfil o mensaje, el sistema DEBE marcar `isActive=false` (nunca `DELETE`) y pedir confirmación en la propia página.
3. Cada mensaje enviado desde `/bot` DEBE guardarse con `id`, `reference` (referencia completa `…/environments/{APP_ENV}/kiArenaMessages/{id}`), `playerRef` (referencia completa al jugador si existe) e `isActive=true`.
