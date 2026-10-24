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

## Checklist para cada cambio

- [ ] ¿Las escrituras nuevas llenan `id`, `reference`, `isActive`, y el código tolera que falten al leer?
- [ ] ¿`reference` y las relaciones son referencias completas del entorno actual, no IDs sueltos?
- [ ] ¿Las lecturas ignoran `isActive === false` y tratan el ausente como activo?
- [ ] ¿Algún flujo borra