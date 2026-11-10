---
name: reglas-desarrollo
description: Reglas obligatorias de Ki Arena - campos id, reference e isActive con borrado suave, referencias completas por entorno, APP_ENV dev, qa o prd, y configuraciones de ejecución y depuración por entorno. Usar en todo desarrollo.
---

# Ki Arena · reglas obligatorias de desarrollo

Fuente: `.kiro/steering/reglas-datos.md` (léelo completo). Resumen:

## 1. Todo modelo declara `id`, `reference` e `isActive` (opcionales)

- Son atributos **opcionales** en el modelo: un registro sin ellos es válido y no debe romper nada.
- Toda escritura nueva SÍ los llena.

- `id` = ID del documento, también guardado como campo.
- `reference` = **referencia Firestore completa** del propio documento, con el entorno: `projects/sayayin-c0dfe/databases/(default)/documents/environments/{APP_ENV}/{colección}/{id}` (`referenceValue` en REST). Nunca un ID suelto.
- Toda relación entre modelos (`playerRef`, `victimRef`, `killerRef`…) también es una referencia completa del **mismo** entorno. Que quede amarrada a `dev`, `qa` o `prd` es intencional: cada entorno tiene datos distintos.
- `isActive` = `true` al crear; `false` es borrado suave.
- Nunca `DELETE`: borrar = `PATCH isActive=false` + `updatedAt`.
- Al leer: `id` ausente → ID del documento; `reference` ausente → permitido; `isActive` ausente → activo. Filtrar con `isActive !== false`.
- No confundir con `alive` (luchador derrotado).

## 2. Rutas Firestore desde `APP_ENV` (`dev` | `qa` | `prd`)

- Estructura: colección raíz `environments` → documento `dev` | `qa` | `prd` → todas las colecciones de la app. Ej.: `environments/qa/kiArenaPlayers/{id}`, `environments/prd/kiArenaUsers/{uid}`. Cada documento de entorno es una base de datos completa; el entorno se cambia solo con el segmento que va después de `environments/`. Nada vive fuera de `environments/{APP_ENV}/`.
- Un solo módulo construye las rutas desde `APP_ENV`; nadie más escribe `environments/...` a mano.
- Valores válidos: `dev`, `qa`, `prd`. `prod` ya no es válido.
- Valor ausente o inválido: error visible (en local, `dev`).

## 3. Ejecutar y depurar en los tres entornos

- Web, Functions, Electron y toda pieza nueva tienen configuración de ejecución/depuración para `dev`, `qa` y `prd`.
- El entorno se elige desde una fuente de configuración (`config/env/.env.{dev|qa|prd}` o selector `pickString` en VS Code), nunca escrito en el código ni fijo en un launch.
- `launch.json`/`tasks.json` multiplataforma (Windows y macOS): scripts Node, bloques `windows`/`osx` si hace falta.
- `dev` por defecto; `prd` pide confirmación y nunca recibe datos sembrados ni escrituras sin aprobación de Pedro.
- Secretos fuera de los archivos versionados (`.env.*.local` ignorado o Secret Manager).

## 4. Cómo mostrar un modelo u objeto a Pedro (Pedro, 2026-10-24)

Cuando Pedro pida ver un objeto, colección o modelo, entrégalo SIEMPRE así:

1. La ruta completa: `environments/{dev|qa|prd}/{colección}/{id}`.
2. Una tabla de campos con columnas **Campo | Tipo | Obligatorio | Descripción** (añade **¿Hoy se guarda?** o **Estado** si hay diferencia entre código y spec). Incluye `id`, `reference` e `isActive` como opcionales.
3. Si hay objetos anidados, una fila por subcampo con notación de punto (`powers.generic.kamehameha.start`).
4. Una tabla de **valores actuales o iniciales** cuando existan.
5. Una tabla de **relaciones** (Desde | Campo | Hacia | Cardinalidad) cuando haya referencias.
6. Nada de listas sueltas en prosa para describir campos.

## 5. Todos los pull requests van hacia `dev` (Pedro, 2026-11-09)

- Todo PR se abre con rama base **`dev`**. Nunca hacia `main` ni hacia otra rama, salvo que Pedro lo pida para ese PR.
- Antes de abrir el PR, trae `dev` a tu rama (merge, sin reescribir historia) y resuelve conflictos ahí.
- Si un PR quedó apuntando a otra rama, ciérralo y abre uno nuevo hacia `dev`.
- El paso de `dev` a `qa`/`main` lo decide Pedro.

## 6. No cambiar los modelos de datos sin consultar a Pedro (Pedro, 2026-11-09)

- Antes de crear una colección, agregar, renombrar o quitar un campo, cambiar un tipo, un id de documento o una relación de Firestore, **pregunta a Pedro y espera su respuesta**. Muestra el cambio como propuesta (ruta, tabla de campos y relaciones, ver regla 4).
- Vale para código, scripts, migraciones, semillas y datos reales en cualquier entorno (dev, qa, prd).
- Si un arreglo necesita tocar un modelo, detente y consulta; arregla primero lo que no lo toque.
- Lo que Pedro edite a mano desde el panel `/admin` es decisión suya y no necesita esta consulta.

## Checklist para cada cambio

- [ ] ¿Las escrituras nuevas llenan `id`, `reference`, `isActive`, y el código tolera que falten al leer?
- [ ] ¿`reference` y las relaciones son referencias completas del entorno actual, no IDs sueltos?
- [ ] ¿Las lecturas ignoran `isActive === false` y tratan el ausente como activo?
- [ ] ¿Algún flujo borra
- [ ] ¿El PR apunta a `dev`?
- [ ] ¿Cambia algún modelo de Firestore? Entonces ¿Pedro lo aprobó antes?
