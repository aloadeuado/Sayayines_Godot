# Requisitos — Seguridad y autoridad del servidor · PENDIENTE

> **Estado:** reglas Firestore públicas (lectura/escritura), sin Authentication, combate y XP calculados en el navegador. Entornos en un solo proyecto.

## Introducción

Antes de abrir el juego a audiencias grandes, el progreso debe estar protegido contra clientes manipulados y escrituras anónimas.

## Requisitos

### HU-SEC-01 — Escrituras autenticadas
**Historia de usuario:** Como dueño del juego, quiero que solo el juego y los operadores escriban, para que nadie altere niveles a mano.

**Criterios de aceptación**
1. Las reglas Firestore DEBEN denegar escrituras anónimas a `kiArenaPlayers` y `kiArenaSettings`.
2. `/settings` y `/bot` DEBEN exigir sesión de operador (Firebase Authentication).
3. Las reglas DEBEN validar tipos y rangos de los campos del perfil.

### HU-SEC-02 — XP y KO autoritativos
**Criterios de aceptación**
1. Los KO y la XP DEBEN calcularse o validarse en un entorno confiable (Cloud Functions u otro servidor).
2. El cliente NO DEBE poder fijar `level` o `xp` arbitrarios.

### HU-SEC-03 — Entornos aislados
**Criterios de aceptación**
1. `prd` DEBE vivir en un proyecto Firebase distinto de `dev/qa`, con sus propias reglas y cuotas.

### HU-SEC-04 — Sin secretos en cliente
**Criterios de aceptación**
1. Ningún secreto de Twitch, TikTok o servicio DEBE estar en `public/`, Firestore legible o Git.

### HU-SEC-05 — Reglas que impiden el borrado físico
**Criterios de aceptación**
1. Las reglas Firestore DEBEN denegar `delete` en todas las colecciones; el borrado es `isActive=false`.
2. Las reglas DEBEN aceptar documentos sin `id`, `reference` o `isActive` (opcionales) y, cuando vengan, validar su tipo (`isActive` boolean) y que `reference` no cambie.
