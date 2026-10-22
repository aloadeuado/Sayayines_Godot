# Tareas — Arena en vivo

## 1. Implementado (verificado en código, 2026-10-22)

- [x] 1.1 Ruta `/` con canvas `900 × 540`, fondo y redirección `ki-arena.html` — _HU-ARE-01_
- [x] 1.2 Render iniciado antes de cargar Firestore; fallback de Settings; timeout 10 s — _HU-ARE-02_
- [x] 1.3 Aura verde→rojo con radio por nivel y aura de carga — _HU-ARE-03_
- [x] 1.4 Barras de HP y XP sobre el luchador — _HU-ARE-04_
- [x] 1.5 Overlay de hitboxes activable — _HU-ARE-05_

## 2. Pendiente

- [ ] 2.1 Corregir la selección por clic: usar `Math.hypot(f.x − x, f.y − y)` en lugar de `f.y − x` en el listener `click` de `game/arena.js` — _HU-ARE-06.2_
  - Verificar con `node --check` y razonando sobre dos luchadores con la misma X y distinta Y.
- [ ] 2.2 Decidir con Pedro si se adopta el canvas vertical `540 × 960` y `?stream=1` del trabajo local, y portarlo — _HU-ARE-07_
- [ ] 2.3 Extraer de `arena.js` un módulo `renderer` (sin cambiar comportamiento) cuando haya pruebas de humo — _diseño_

## 3. Correcciones por reglas obligatorias (2026-10-22) · requieren aprobación de Pedro para tocar código

- [ ] 3.1 Selector de entorno de `/` con `dev|qa|prd` o retirado si `APP_ENV` lo fija el despliegue — _reglas-datos_
- [ ] 3.2 Mensajes publicados desde la arena con `reference` completa y `playerRef` al jugador — _reglas-datos_
