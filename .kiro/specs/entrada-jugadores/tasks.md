# Tareas — Entrada de jugadores

## 1. Implementado (verificado en código, 2026-10-22)

- [x] 1.1 Crear perfil nuevo con raza aleatoria entre habilitadas — _HU-ENT-01_
- [x] 1.2 Validación 3–24 `[A-Za-z0-9_.-]`, clave en minúsculas, anti-duplicado vivo y en curso — _HU-ENT-02_
- [x] 1.3 Reingreso con progreso y HP restaurado — _HU-ENT-03_
- [x] 1.4 `E` publicada una sola vez; historial no se reejecuta — _HU-ENT-04_
- [x] 1.5 Carga de perfiles vivos sin CPU ni reescritura — _HU-ENT-05_

## 2. Pendiente

- [ ] 2.1 Decidir con Pedro si una `E` hecha sin arena abierta debe ejecutarse al abrirla (p. ej., marcar mensajes procesados en Firestore en vez de solo en memoria) — _Limitaciones_
- [ ] 2.2 Usar escritura condicional (precondición `exists=false` del REST) al crear perfiles para evitar dobles creaciones entre pestañas — _HU-ENT-02_
- [ ] 2.3 Cuando exista Twitch/TikTok, usar el ID estable de la plataforma como clave externa y `username` solo como presentación — _ver `integracion-twitch`_

## 3. Correcciones por reglas obligatorias (2026-10-22) · requieren aprobación de Pedro para tocar código

- [ ] 3.1 `joinPlayer` crea perfiles con `id`, `reference`, `isActive=true` — _HU-ENT-01.1_
- [ ] 3.2 `joinPlayer` rechaza `E` de perfiles `isActive=false` sin recrearlos — _HU-ENT-06.2_
- [ ] 3.3 `init` y `reloadCloudPlayers` ignoran perfiles inactivos — _HU-ENT-06.3_
- [ ] 3.4 Acción de operador para desactivar/reactivar perfil (en `/bot`) — _HU-ENT-06.1, 06.4_
