# Ki Arena y Firebase

El cliente web queda enlazado al proyecto Firebase `sayayin-c0dfe` y a Firestore `(default)`, región `us-central1`. Firebase Hosting se configura para servir el contenido de `outputs/`.

## Datos

Firestore es el único almacenamiento persistente del juego. Ki Arena guarda perfiles y estado recuperable en `environments/dev/kiArenaPlayers/{usuario-normalizado}`, chat en `environments/dev/kiArenaMessages/{auto-id}` y bajas en `environments/dev/kiArenaEvents/{auto-id}`. No guarda progreso en `localStorage`; posiciones y animaciones viven solo en memoria durante la partida y se regeneran al cargar. Las colecciones anteriores (`characters`, `warriors`, `interactions`, `messages`, `partners` y `settings`) no se modifican.

## Pasar la partida local

Al abrir la aplicación, Ki Arena busca las claves del guardado antiguo en el origen actual del navegador, las sube a Firestore y las elimina del almacenamiento del navegador tras completar la migración. Si el guardado antiguo está en otro origen (`file://` frente a `localhost`), abre Ki Arena desde ese mismo origen y pulsa **Migrar guardado anterior a Firebase**. Como último recurso, **Importar respaldo temporal** lee un JSON en memoria y lo envía directamente a Firestore; la aplicación no conserva el archivo. Para usuarios que ya estén en Firebase, la migración conserva el nivel más alto y no reduce bajas ni derrotas.

Para servir la aplicación desde la raíz de esta carpeta, ejecuta `firebase.cmd emulators:start --only hosting --project sayayin-c0dfe` y abre `http://127.0.0.1:5000/ki-arena.html`.

`file://` y `http://localhost` son orígenes separados. El archivo de migración es solo un puente opcional, no una base local. No se publica nada a Hosting hasta ejecutar un comando explícito de deploy.

## Seguridad y alcance

Las reglas que ya están publicadas en el proyecto permiten lectura y escritura sin iniciar sesión para todos los documentos. La integración respeta esas reglas existentes y limita sus escrituras a la colección nueva, pero esto no vuelve privado el proyecto. No se cambiaron ni desplegaron reglas porque eso podría afectar el cliente anterior que usa `warriors` y las demás colecciones. Antes de publicar el juego, hay que revisar una sustitución de reglas con autenticación y confirmar qué acceso necesita la aplicación existente.
