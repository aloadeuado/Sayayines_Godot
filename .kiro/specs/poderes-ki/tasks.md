# Tareas — Poderes de ki

## 1. Implementado (verificado en código, 2026-10-22)

- [x] 1.1 Desbloqueo `V` Freezer/1, `M` 10, `K` 20 validado en Bot y arena — _HU-POD-01_
- [x] 1.2 Cooldowns 1.8 / 7 / 3.8 s y exclusión entre estados — _HU-POD-02_
- [x] 1.3 Fases de preparación con luchador quieto — _HU-POD-03_
- [x] 1.4 Rayos horizontales multiobjetivo, un impacto por rayo — _HU-POD-04_
- [x] 1.5 Curvas por nivel genéricas y Freezer desde Settings — _HU-POD-05_
- [x] 1.6 Anchuras por nivel y perfil Freezer — _HU-POD-06.1, 06.2_
- [x] 1.7 Catálogo de pendientes visible sin efecto en combate — _HU-POD-07_

## 2. Pendiente

- [ ] 2.1 Portar la Ráfaga de Ki `B` (ver spec `rafaga-ki-b`)
- [ ] 2.2 Confirmar con Pedro si el margen extra de 12 px del Kamehameha es intencional; si no, igualarlo a `ancho × 0.675 + 12` y verificar con el overlay — _HU-POD-06.4_
- [ ] 2.3 Llevar `FREEZER_POWER_PROGRESSION` (anchuras) a `gameplay-settings.js` para que también sean configurables — _HU-POD-06_
- [ ] 2.4 Script Node de aserciones para `powerBlockReason` y `powerMultiplierAtLevel` (niveles 1, 9, 10, 19, 20, 100; Freezer y no Freezer) — _HU-POD-01, 05_
