# Tareas — Autenticación de usuarios · EN DESARROLLO

> La implementación la lleva el hilo «Login con proveedores y usuario». Marcar aquí cada tarea al terminarla.

- [x] 1. Módulo `APP_ENV` y helper de referencias completas; `arena-cloud.js` lee/escribe `referenceValue` y arrays — _HU-AUT-07_ · Hecho en `public/src/config/environment.js` y `functions/src/environment.js`; `arena-cloud.js` ya lee `referenceValue`, arrays y mapas (las escrituras de cuentas las hace el servidor con Admin SDK).
- [ ] 2. Semilla de `kiArenaProviderTypes` (password, google, apple, tiktok, twitch, kick) solo en `dev`, con aprobación — _HU-AUT-07.4, 07.5_
- [x] 3. Pantalla de login/registro estilo DBZ con email+contraseña y botones por tipo activo — _HU-AUT-01_
- [ ] 4. Google y Apple con Firebase Auth nativo; nombre de Apple en la primera autorización — _HU-AUT-02_ · Google y Apple hechos en código; Apple queda apagado (`allowLogin: false`) hasta tener la cuenta de Apple. Pendiente: Firebase web no entrega el nombre de Apple, el servidor ya acepta `appleName` si llega.
- [x] 5. Cloud Functions OAuth para TikTok, Twitch y Kick (PKCE en Kick) con custom token — _HU-AUT-03_
- [x] 6. Resolución login → usuario con transacción y evento `link` — _HU-AUT-04_
- [x] 7. Configuración › Cuentas vinculadas: conectar, `state` anti-CSRF, conflicto, relink — _HU-AUT-05_
- [x] 8. Desvincular con mínimo uno, cambio de principal y `unlink` en Firebase Auth — _HU-AUT-06_
- [ ] 9. Reglas Firestore: escritura solo servidor, lectura del propio usuario — _HU-AUT-08_
- [ ] 10. Enlace usuario ↔ jugador (`playerRef` / `userRef`) según la decisión de Pedro — _HU-AUT-09_
- [ ] 11. Pedir a Pedro: configuración de proveedores en Firebase, client IDs/secrets por entorno, cuenta Apple, app TikTok — _HU-AUT-02, 03_
- [ ] 12. Verificar (`node --check`, pruebas del modelo, `git diff --check`), CHANGELOG, `PROJECT_SPEC.md`
