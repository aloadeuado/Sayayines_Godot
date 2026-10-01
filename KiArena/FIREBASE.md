# Firebase y entornos

El proyecto actual `sayayin-c0dfe` contiene Firestore `(default)`. El selector usa `?env=dev`, `?env=qa` o `?env=prod` para definir el prefijo de las colecciones.

- `environments/{env}/kiArenaPlayers/{username-normalizado}`
- `environments/{env}/kiArenaMessages/{auto-id}`
- `environments/{env}/kiArenaEvents/{auto-id}`

Sin parámetro se usa `dev`. Los datos actuales de desarrollo permanecen en `environments/dev`. QA y Producción son espacios vacíos distintos dentro del mismo proyecto por ahora. Para producción real, configuren proyectos Firebase independientes y reglas propias; cambiar solo el prefijo no separa permisos, cuotas ni facturación.

La aplicación no lee ni escribe almacenamiento local del navegador. Posiciones y animaciones viven en memoria durante la sesión.

Firebase Hosting sirve los archivos estáticos desde `outputs/`. La vista del emulador local se inicia con `firebase.cmd emulators:start --only hosting --project sayayin-c0dfe`.

## Seguridad pendiente

Las reglas existentes de Firestore permiten lectura y escritura públicas. No se modificaron para evitar afectar otros clientes. Antes de exponer QA o Producción, deben añadirse Firebase Authentication, validaciones de reglas y, para operaciones de XP y bajas, autoridad del servidor mediante Cloud Functions.
