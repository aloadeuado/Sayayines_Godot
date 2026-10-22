# Tareas — Progresión RPG

## 1. Implementado (verificado en código, 2026-10-22)

- [x] 1.1 `calculateLevelStats` con multiplicadores por entorno — _HU-RPG-01_
- [x] 1.2 XP por baja, bucle de subidas, tope 100 — _HU-RPG-02_
- [x] 1.3 Nivel leído de Firestore sin inferencias — _HU-RPG-03_
- [x] 1.4 Migración proporcional de HP v1→v2 y conservación de % — _HU-RPG-04.1, 04.2_
- [x] 1.5 Inspección de atributos y poderes desbloqueados — _HU-RPG-05_

## 2. Pendiente

- [ ] 2.1 Mover `xpForNext` y la fórmula de XP por baja a `gameplay-settings.js` y reutilizarla en arena y Bot — _HU-RPG-02_
- [ ] 2.2 Recargar Settings en la arena periódicamente (o al detectar `updatedAt` nuevo) y llamar `applySettingsToFighters` — _HU-RPG-04.3_
- [ ] 2.3 Script Node con aserciones de la tabla de referencia — _HU-RPG-01_
