# Ki Arena y Firebase

El cliente web queda enlazado al proyecto Firebase `sayayin-c0dfe` y a Firestore `(default)`, región `us-central1`. Firebase Hosting se configura para servir el contenido de `outputs/`.

## Datos

Ki Arena guarda progreso en `environments/dev/kiArenaPlayers/{usuario-normalizado}`. El documento solo contiene el nombre público, raza, nivel, XP, bajas, derrotas y versión del esquema. Las colecciones que ya existían (`characters`, `warriors`, `interactions`, `messages`, `partners` y `settings`) no se modifican.

## Pasar la partida local

1. Abre la versión actual de Ki Arena desde su pestaña `file://` y pulsa **Exportar progreso local**. Guarda `ki-arena-progreso.json`.
2. Sirve la carpeta con `firebase.cmd emulators:start --only hosting --project sayayin-c0dfe` desde la raíz de este proyecto y abre `http://127.0.0.1:5000/ki-arena.html`.
3. Pulsa **Importar y migrar a Firebase** y selecciona el JSON. Los datos locales se conservan; para usuarios ya presentes en Firestore, la migración conserva el nivel más alto y no reduce bajas ni derrotas.

`file://` y `http://localhost` tienen almacenamientos locales distintos, por eso se requiere el archivo de respaldo. No se publica nada a Hosting hasta ejecutar un comando explícito de deploy.

## Seguridad y alcance

Las reglas que ya están publicadas en el proyecto permiten lectura y escritura sin iniciar sesión para todos los documentos. La integración respeta esas reglas existentes y limita sus escrituras a la colección nueva, pero esto no vuelve privado el proyecto. No se cambiaron ni desplegaron reglas porque eso podría afectar el cliente anterior que usa `warriors` y las demás colecciones. Antes de publicar el juego, hay que revisar una sustitución de reglas con autenticación y confirmar qué acceso necesita la aplicación existente.
