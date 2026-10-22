---
inclusion: always
---

# Producto: Ki Arena

Ki Arena (proyecto DBZ_FLOW) es un juego web continuo de combate 2D inspirado en Dragon Ball, pensado para mostrarse en una transmisión en vivo (OBS, TikTok vertical, Twitch). Las personas del chat entran con un nombre, reciben una raza, recorren la arena rebotando en los bordes, pelean cuerpo a cuerpo al acercarse y lanzan poderes con letras. El progreso RPG (nivel 1–100) se guarda en Cloud Firestore.

> Pese al nombre del repositorio (`Sayayines_Godot`), **no hay proyecto Godot**: el producto es HTML/CSS/JS servido por Firebase Hosting.

## Usuarios

| Rol | Qué hace | Vista |
|---|---|---|
| Espectador/jugador | Escribe `E`, `V`, `M`, `K` en el chat para entrar y lanzar poderes. | Chat (hoy simulado en `/bot`) |
| Operador del stream | Controla chat, roster y métricas sin tocar la ventana transmitida. | `/bot` |
| Administrador del juego | Ajusta fórmulas por nivel, curvas de poderes y razas habilitadas por entorno. | `/settings` |
| Audiencia | Ve la arena limpia en el stream. | `/` |

## Prioridades (en orden)

1. La arena **siempre** se dibuja y sigue viva, aunque Firebase falle; el error se informa.
2. Progreso real y usuarios únicos: nivel, XP, raza y bajas confiables; sin duplicados ni pérdidas.
3. El daño, la anchura visible y la hitbox de cada poder concuerdan y se configuran en Settings.
4. El operador trabaja desde `/bot` sin alterar la escena transmitida.
5. Una integración simulada se distingue claramente de una conexión real.
6. Código legible, modular, documentado y compatible con perfiles Firestore existentes.

## Comandos vigentes

| Letra | Acción | Requisito |
|---|---|---|
| `E` | Entrar / reingresar | Nombre válido de 3–24 caracteres `[A-Za-z0-9_.-]`, no estar ya vivo |
| `V` | Rayo Mortal | Solo raza Freezer, desde nivel 1 |
| `M` | Makankosappo | Todas las razas, desde nivel 10 |
| `K` | Kamehameha | Todas las razas, desde nivel 20 |
| `B` | Ráfaga de Ki | **Pendiente en el repositorio** (nivel 5, todas las razas); ver spec `rafaga-ki-b` |

## Estado real (2026-10-22, rama `feature/migrationclaud`)

- Implementado: arena `/`, panel `/bot`, `/settings`, persistencia Firestore por REST, entornos lógicos `dev|qa|prod`, progresión RPG, poderes `V/M/K`, duelos, auras, hitboxes.
- **No implementado en GitHub**: lectura real de Twitch, adaptador/regalos de TikTok, poder `B`, app de escritorio Electron, autenticación, reglas Firestore seguras y autoridad de XP/KO en servidor. El documento `KiArena/contexto-proyecto/` describe parte de esto como trabajo local no subido.
- Nunca afirmar que un despliegue, Twitch o TikTok están activos sin evidencia.

## Reglas de trabajo

- Cambios mínimos y dentro del alcance pedido.
- Cada instrucción de Pedro recibe una entrada fechada en `KiArena/docs/CHANGELOG.md`.
- Un poder o estadística nueva debe llegar a Settings, `PROJECT_SPEC.md`, su spec en `.kiro/specs/` y el flujo de juego completo.
- No modificar datos reales de Firestore para probar; no abrir el navegador ni las ventanas de stream de Pedro; no hacer commit, push ni deploy sin pedido explícito.
- Responder y documentar en español.
- Reglas de datos obligatorias en `reglas-datos.md`: todo modelo con `id`, `reference`, `isActive` (borrado suave, nunca `DELETE`) y rutas desde `APP_ENV` = `dev|qa|prd`.
