# Ki Arena

Prototipo de arena 2D escrito en HTML, CSS y JavaScript. Incluye combate automático, sprites animados, poderes, chat de comandos y persistencia local; la integración opcional conecta el progreso a Firestore del proyecto Firebase `sayayin-c0dfe`.

## Ejecutar localmente

Abre `outputs/ki-arena.html` para jugar en modo local. Para usar Firebase, sirve el contenido por HTTP desde esta carpeta:

```powershell
firebase.cmd emulators:start --only hosting --project sayayin-c0dfe
```

Luego abre `http://127.0.0.1:5000/ki-arena.html`. El respaldo del progreso local se exporta desde la versión anterior y se importa con el botón del chat.

## Estructura

- `outputs/ki-arena.html`: juego y UI
- `outputs/ki-arena-firebase.js`: lectura y escritura del progreso remoto
- `outputs/firebase-config.js`: configuración web pública del proyecto
- `outputs/*.png`: fondo y sprites
- `firebase.json`, `.firebaserc`, `FIREBASE.md`: Hosting y notas de integración

Las reglas de Firestore del proyecto son actualmente públicas; revisarlas antes de publicar el juego.
