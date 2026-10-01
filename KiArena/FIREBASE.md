# Ki Arena y Firebase

El cliente web queda enlazado al proyecto Firebase `sayayin-c0dfe` y a Firestore `(default)`, región `us-central1`. Firebase Hosting se configura para servir el contenido de `outputs/`.

## Datos

Firestore es el único almacenamiento persistente del juego. Ki Arena guarda perfiles y estado recuperable en `environments/dev/kiArenaPlayers/{usuario-normalizado}`, chat en `environments/dev/kiArenaMessages/{auto-id}` y bajas en `environments/dev/kiArenaEvents/{auto-id}`. No guarda progreso en `localStorage`; posiciones y animaciones viven solo en memoria durante la partida y se regeneran al cargar. Las colecciones anteriores (`characters`, `warriors`, `interactions`, `messages`, `partners` y `settings`) no se modifican.

## Persistencia

La partida ya fue migrada a Firestore. La aplicaci?n no lee ni escribe almacenamiento local del navegador y no incluye importaci?n de archivos. Posiciones y animaciones solo existen en memoria mientras la p?gina est? abierta; al volver a cargar, se reconstruyen desde los perfiles de Firestore.

## Seguridad y alcance

Las reglas que ya están publicadas en el proyecto permiten lectura y escritura sin iniciar sesión para todos los documentos. La integración respeta esas reglas existentes y limita sus escrituras a la colección nueva, pero esto no vuelve privado el proyecto. No se cambiaron ni desplegaron reglas porque eso podría afectar el cliente anterior que usa `warriors` y las demás colecciones. Antes de publicar el juego, hay que revisar una sustitución de reglas con autenticación y confirmar qué acceso necesita la aplicación existente.
