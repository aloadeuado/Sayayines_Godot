# Requisitos — Regalos de TikTok · PENDIENTE

> **Estado:** no está en el repositorio. El contexto de Pedro describe un adaptador local de «eventos de regalo normalizados» y un botón de simulación en `/bot`, más `docs/TIKTOK_INTEGRATION.md`, todo sin subir. **No hay conexión real con TikTok Live.**

## Introducción

Un regalo de TikTok Live debe poder traducirse a un comando de juego permitido (p. ej., entrar o lanzar un poder) para el usuario que lo envía.

## Requisitos

### HU-TT-01 — Mapear regalos a comandos
**Historia de usuario:** Como streamer, quiero que ciertos regalos activen poderes, para premiar a quien regala.

**Criterios de aceptación**
1. El sistema DEBE mapear cada regalo explícitamente a un comando permitido (`E`, `B`, `V`, `M`, `K`); regalos sin mapa NO DEBEN hacer nada.
2. El comando resultante DEBE pasar por las mismas validaciones de entrada, raza y nivel.

### HU-TT-02 — Simulación claramente marcada
**Criterios de aceptación**
1. `/bot` DEBE ofrecer un control «Simular regalo» etiquetado como simulación.
2. La UI NO DEBE afirmar que TikTok está conectado sin un receptor real activo.

### HU-TT-03 — Receptor real seguro (futuro)
**Criterios de aceptación**
1. El receptor DEBE vivir en un backend confiable, validar origen y esquema, deduplicar por ID de regalo y limitar frecuencia.
2. Las credenciales NO DEBEN estar en el navegador.

### HU-TT-04 — Reglas de datos
**Criterios de aceptación**
1. Cada regalo procesado DEBE guardar su mensaje con ID `tiktok_{eventId}`, `reference` completa e `isActive=true`; la deduplicación DEBE usar ese ID.
2. Las rutas DEBEN salir de `APP_ENV` (`dev|qa|prd`).
