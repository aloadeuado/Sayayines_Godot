# Ki Arena

Prototipo de arena 2D escrito en HTML, CSS y JavaScript. Incluye combate automático, sprites animados, poderes, chat de comandos y persistencia exclusivamente en Firestore del proyecto `sayayin-c0dfe`.

## Ejecutar localmente

Sirve el contenido por HTTP desde esta carpeta para usar Firebase:

```powershell
firebase.cmd emulators:start --only hosting --project sayayin-c0dfe
```

Luego abre `http://127.0.0.1:5000/ki-arena.html`. El juego carga y guarda perfiles, comandos y bajas en Firestore. Las animaciones usan memoria temporal; no se conserva progreso en el navegador. Al iniciar, migra las claves del guardado anterior de forma automática si existen en el mismo origen.

## Estructura

- `outputs/ki-arena.html`: juego y UI
- `outputs/ki-arena-firebase.js`: lectura y escritura del progreso remoto
- `outputs/firebase-config.js`: configuración web pública del proyecto
- `outputs/*.png`: fondo y sprites
- `firebase.json`, `.firebaserc`, `FIREBASE.md`: Hosting y notas de integración

El código del juego y los sprites son archivos estáticos en el repositorio/Hosting; Firestore guarda datos y progreso, no los binarios. Las reglas actuales de Firestore son públicas; revisarlas antes de publicar el juego.
