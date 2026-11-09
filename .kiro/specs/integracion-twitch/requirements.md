# Requisitos — Integración con chat de Twitch · PENDIENTE

> **Estado:** solo existe `public/src/services/twitch/README.md`. No hay lectura de chat real ni OAuth. La rama `Twitch` del repositorio tiene commits que no están en `feature/migrationclaud`; revisarla antes de empezar.

## Introducción

Los espectadores de un canal de Twitch deben poder usar los mismos comandos que hoy se simulan en `/bot`, con identidad estable y sin exponer secretos.

## Requisitos

### HU-TW-01 — Comandos desde el chat real
**Historia de usuario:** Como espectador de Twitch, quiero escribir `E`, `V`, `M` o `K` en el chat, para jugar sin otra app.

**Criterios de aceptación**
1. CUANDO llega un mensaje del canal configurado, el adaptador DEBE traducirlo a `{ username, text }` y publicarlo como mensaje de arena.
2. Un mensaje que no sea comando DEBE poder mostrarse sin disparar acciones.
3. Las reglas de entrada, raza, nivel y poderes DEBEN ser las mismas que para `/bot` (sin duplicar lógica en el adaptador).

### HU-TW-02 — Identidad estable
**Criterios de aceptación**
1. El perfil DEBE tener ID `twitch_{twitchUserId}` y `reference` completa del entorno; el sistema DEBE usar el ID de usuario de Twitch como clave externa y `username` solo como presentación (pendiente de confirmar con Pedro).
2. El broadcaster o un mensaje sin identidad válida NO DEBE sobrescribir otro perfil.

### HU-TW-03 — Seguridad
**Criterios de aceptación**
1. Client Secret, access y refresh tokens NO DEBEN estar en `public/`, en Firestore legible ni en Git.
2. El sistema DEBE deduplicar eventos y limitar frecuencia por usuario.
3. El sistema DEBE distinguir en la UI «Twitch conectado» de «simulación».

## Información que falta (pedir a Pedro)
Canal, Client ID, URL de callback, quién autoriza (broadcaster o bot), scopes, URL de Hosting y si los botones manuales siguen activos con chat real.

### HU-TW-04 — Reglas de datos
**Criterios de aceptación**
1. Cada mensaje DEBE guardarse con ID `twitch_{messageId}`, `reference` completa, `playerRef` al perfil e `isActive=true`; la deduplicación DEBE usar ese ID.
2. Las rutas DEBEN salir de `APP_ENV` (`dev|qa|prd`).
