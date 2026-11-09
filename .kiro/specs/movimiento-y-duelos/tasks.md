# Tareas — Movimiento y duelos

## 1. Implementado (verificado en código, 2026-10-22)

- [x] 1.1 Movimiento lineal con rebote y simulación continua — _HU-DUE-01_
- [x] 1.2 Inicio de duelo a < 58 px — _HU-DUE-02_
- [x] 1.3 Secuencia A/B/A/B, esquiva y registro de cada golpe — _HU-DUE-03_
- [x] 1.4 Mitigación `max(4, bruto − def × 0.45)`, muerte, `knockout` — _HU-DUE-04_
- [x] 1.5 Interrupción de duelo al lanzar poder — _HU-DUE-05_

## 2. Pendiente

- [ ] 2.1 Exponer en Settings la distancia de duelo, el factor de defensa y el daño mínimo si Pedro quiere balancearlos sin tocar código — _HU-DUE-04_
- [ ] 2.2 Extraer `combat` (duelos + `hit`) de `arena.js` a un módulo puro testeable con Node — _diseño_
- [ ] 2.3 Mover el cálculo de KO/XP a un servidor confiable (ver `seguridad-y-autoridad`) — _HU-DUE-04.2_

## 3. Correcciones por reglas obligatorias (2026-10-22) · requieren aprobación de Pedro para tocar código

- [ ] 3.1 Evento `knockout` con campos base (vía `addEvent` del adaptador) — _HU-DUE-04.2_
