# Registro de instrucciones y cambios de Ki Arena

Este registro es acumulativo. Cada nueva instrucción del usuario sobre juego, arquitectura, datos, entornos, Twitch, publicación o seguridad recibe una entrada fechada. Las propuestas no implementadas se anotan como pendientes; las preguntas informativas no cambian requisitos y se registran solo si aportan una decisión al proyecto.

## 2026-10-01 — especificación persistente y contexto descargable

- **Solicitud:** guardar skills y especificaciones con el contexto del proyecto; hacer que las futuras instrucciones se agreguen al registro; subirlo para que quien descargue el repositorio tenga el contexto técnico y funcional.
- **Documentación creada:** `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `FIRESTORE.md`, `TWITCH_INTEGRATION.md`, este registro, `AGENTS.md` y `.agents/skills/ki-arena-project/SKILL.md`; actualizar índice README.
- **Regla futura:** registrar cada instrucción del usuario relacionada con el proyecto y actualizar la especificación cuando cambie un hecho o requisito.
- **Verificación solicitada/realizada:** la publicación de la documentación corresponde a esta entrada; el historial Git proporciona el identificador del commit que la contiene.

## 2026-10-01 — separar la estructura del prototipo en rama Twitch

- **Solicitud:** aplicar la arquitectura de carpetas propuesta en la rama actual, subirla y probarla antes de reemplazar la estructura anterior.
- **Implementación:** Hosting usa `public/`; se separaron página, CSS, assets, arranque, módulo de arena, configuración Firebase y adaptador de Firestore; `/ki-arena.html` redirige conservando parámetros. La integración Twitch se documentó como límite pendiente; no se conectaron credenciales.
- **Verificación:** sintaxis de cinco módulos ES; respuestas HTTP de página, CSS, JS y cinco sprites; navegador en `?env=qa` informó conexión Firebase; ruta anterior redirigió manteniendo entorno. Se guardó copia previa fuera del repo durante la validación.
- **Publicación:** rama `Twitch`, commit `fe2b7f82c5254933ced1c39331ee486af58e8806`.

## Historial funcional consolidado del 2026-10-01

Estas entradas recogen decisiones y cambios solicitados durante el prototipado, en el orden aproximado en que se trataron. El estado actual exacto se describe en `PROJECT_SPEC.md`; las ideas no activas aparecen como pendientes.

1. Crear un juego 2D de personajes inspirado en razas/poderes de Dragon Ball, con vuelo, rebotes en mapa, combates, niveles RPG y estadísticas de ataque/defensa física y de ki.
2. Usar la imagen de la Isla Kame como fondo y añadir sprites animados.
3. Hacer que los luchadores reboten linealmente por la pantalla y disponer de control manual de Kamehameha por personaje.
4. Dibujar el Kamehameha como rayo animado horizontal, en la dirección X del personaje; preparar manos hacia atrás y empuje hacia delante antes del disparo, y congelar al personaje mientras el rayo está activo.
5. Mejorar definición y escala de sprites y mantener calidad visual coherente en animaciones de poderes.
6. Al tocarse, personajes empiezan una secuencia de puños/patadas. Definir progresión RPG de nivel 1 a 100, XP, bajas, cuatro estadísticas y persistencia asociada al nombre de usuario.
7. Corregir un estado en que el canvas quedó vacío; no ocultar el juego si no hay luchadores activos.
8. Quitar reinicio de partida; simulación continua incluso con un luchador. Añadir auras que crecen y cambian de verde hacia rojo conforme sube el nivel.
9. Crear chat de arena inspirado en plataformas de stream: `E` para entrar, `K` Kamehameha y `M` Makankosappo; campo de usuario único, botones para simular mensajes. El chat quedó debajo del juego.
10. Mostrar jugadores que ya habían enviado `E`; permitir ingreso individual desde roster, deshabilitar jugadores presentes y botón para agregar todos los pendientes. Evitar duplicados case-insensitive.
11. Migrar persistencia del almacenamiento local a Firebase/Firestore, conectar con `sayayin-c0dfe` y conservar el juego en Hosting estático; registrar que no se debe afirmar que el sitio está desplegado si no se ha verificado.
12. Reorganizar el código con arquitectura mantenible y selector de entornos dev/QA/prod. Los tres namespaces todavía usan el mismo proyecto Firebase.
13. Eliminar poderes automáticos por proximidad; escalar daño y anchura de Kamehameha/Makankosappo con nivel; aplicar resistencias adecuadas y permitir multi-target dentro de la anchura visible.
14. Asignar raza aleatoria a un perfil nuevo entre las cuatro razas, guardándola para entradas futuras.
15. Añadir para Freezer la técnica de dedo `V`/Rayo Mortal. En su progresión propia, `V` primero, después `M` y por último `K`; los poderes posteriores se diseñan más fuertes y delgados. Esto es un perfil Freezer, no una regla global.
16. Añadir barra de XP debajo de vida.
17. Publicar en GitHub ramas `dev` y `Twitch`; `Twitch` es el espacio de integración de stream. Al último registro, ambas recibieron commit `4797126…`; el refactor siguiente se hizo únicamente en `Twitch`.
18. Se pidió recordar la arquitectura de carpetas y el diagrama de dependencias, no solo la arquitectura de Firebase/runtime. Esa precisión quedó reflejada en `ARCHITECTURE.md` y guio el refactor modular de la rama `Twitch`.

## 2026-10-02 — selección rápida de chat y corrección del Rayo Mortal

- **Solicitud:** añadir selección de usuario desde cada fila de luchador; corregir el rayo de Freezer según la referencia visual: láser fino magenta emitido por un dedo.
- **Implementación:** cada luchador ahora tiene un botón **Elegir** que rellena el usuario del chat y resalta el remitente seleccionado, sin cambiar el panel de inspección. El Rayo Mortal entra en el mismo ciclo de avance y colisión que los rayos, y calcula su propio daño y radio de impacto en vez de pasar por la ruta de proyectiles dirigida a un objetivo. Su dibujo es magenta, delgado y luminoso; conserva la dirección horizontal del eje X.
- **Archivos:** public/src/game/arena.js, public/styles/arena.css, docs/PROJECT_SPEC.md.
- **Verificación:** pasó la comprobación de sintaxis de los módulos JavaScript y un smoke test HTTP local: página, CSS, módulos y sprite de poses respondieron 200. No se probó contra Firestore ni se desplegó Hosting.
- **Rama/commit:** rama Twitch; implementación publicada en c37e6c7b3d80405272d638b00ab840f6fd4e3143. Sin despliegue a Firebase Hosting.

## 2026-10-02 — aumentar el daño del Rayo Mortal

- **Solicitud:** el rayo impactaba, pero el daño se sentía demasiado bajo.
- **Decisión:** aumentar solo el multiplicador de daño de `V` de 1.7–2.7 a 2.6–3.4 veces el ataque de ki. El daño sigue descontando defensa de ki y la técnica conserva su posición por debajo de Makankosappo (3.2–4.2) y Kamehameha (5.5–7.0). La anchura y la zona de colisión no cambian.
- **Archivos:** public/src/game/arena.js y docs/PROJECT_SPEC.md.
- **Verificación:** pasó la comprobación de sintaxis ES module y se comprobó la fórmula al nivel 1 y 100; no se escribieron datos de Firestore.
- **Rama/commit:** rama Twitch; cambio publicado en 0f3fa03aa7a4a806373fe364251c377818ae5aa1. Sin despliegue a Firebase Hosting.

## Plantilla para entradas futuras

```text
## YYYY-MM-DD — título corto
- Solicitud:
- Decisión/estado: implementado | pendiente | descartado
- Cambios (archivos o módulos):
- Verificación:
- Rama/commit o dependencia pendiente:
```
