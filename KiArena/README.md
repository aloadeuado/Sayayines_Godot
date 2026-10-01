# Ki Arena

Prototipo de arena 2D en HTML, CSS y JavaScript. Los perfiles, el progreso, el chat y las bajas se guardan en Cloud Firestore. El juego y sus imágenes son archivos estáticos.

## Entornos

El selector cambia entre Desarrollo, QA y Producción. El entorno activo viaja en el parámetro `?env=dev`, `?env=qa` o `?env=prod` de la URL y define el prefijo de las colecciones. Sin parámetro, se usa Desarrollo.

Por ahora los tres espacios son rutas separadas dentro del proyecto Firebase `sayayin-c0dfe`; esto los separa lógicamente, pero no separa permisos, cuotas ni facturación. Antes de producción real, conviene asignar proyectos Firebase independientes para QA y producción con sus reglas propias.

## Código

- `outputs/ki-arena.html`: escena, chat y paneles
- `outputs/ki-arena-firebase.js`: acceso a Firestore
- `outputs/firebase-config.js`: selección de entorno y configuración web
- `outputs/*.png`: sprites y fondo
- `firebase.json` y `.firebaserc`: Firebase Hosting y proyecto CLI

La aplicación no guarda progreso en almacenamiento local del navegador. La simulación visual activa vive en memoria y se reconstruye al abrir la página.

## Vista local

`firebase.cmd emulators:start --only hosting --project sayayin-c0dfe`

Luego abre `http://127.0.0.1:5000/ki-arena.html`.
