# Diseño — Seguridad · PENDIENTE

Opciones a decidir con Pedro (impacto alto, cambia arquitectura):

1. **Reglas + Auth de operador**, combate sigue en cliente: rápido; protege de escrituras anónimas pero no de un operador malicioso.
2. **Cloud Function `recordKnockout`** que valida y aplica XP/KO; el cliente solo envía eventos. Requiere plan Blaze.
3. **Servidor de juego autoritativo**: simulación en servidor; la arena solo dibuja. Mayor coste y cambio.

Recomendación inicial: (1) primero, luego (2). Probar reglas solo con el Emulator Suite.
