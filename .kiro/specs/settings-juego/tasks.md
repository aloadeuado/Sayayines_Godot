# Tareas — Settings de juego

## 1. Implementado (verificado en código, 2026-10-22)

- [x] 1.1 Multiplicadores de atributos con normalización `[0, 100]` — _HU-SET-01_
- [x] 1.2 Curvas por poder y validaciones de orden — _HU-SET-02_
- [x] 1.3 Razas elegibles con mínimo una — _HU-SET-03_
- [x] 1.4 Documento por entorno, defaults, selector y restaurar — _HU-SET-04_

## 2. Pendiente

- [ ] 2.1 Mostrar junto a cada curva la anchura visible y el radio de impacto resultantes (prioridad 3 del producto) — _HU-SET-02_
- [ ] 2.2 Quitar el código de formulario heredado de `game/arena.js` cuando se confirme que ninguna vista lo usa — _diseño_
- [ ] 2.3 Proteger `/settings` con autenticación (ver `seguridad-y-autoridad`)

## 3. Correcciones por reglas obligatorias (2026-10-22) · requieren aprobación de Pedro para tocar código

- [ ] 3.1 `saveSettings` escribe `id`, `reference`, `isActive`; `getSettings` ignora el documento si `isActive=false` — _HU-SET-04.6_
- [ ] 3.2 Selector de entorno con `prd` en lugar de `prod` (o retirado si `APP_ENV` lo fija el despliegue) — _HU-SET-04.3_
