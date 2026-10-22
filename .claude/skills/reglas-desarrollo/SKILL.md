---
name: reglas-desarrollo
description: Reglas obligatorias de Ki Arena para cualquier modelo o ruta de Firestore - campos id, reference e isActive con borrado suave, y entorno APP_ENV dev, qa o prd. Usar en todo desarrollo que lea o escriba datos.
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

- Un solo módulo construye las rutas desde `APP_ENV`; nadie más escribe `environments/...` a mano.
- Valores válidos: `dev`, `qa`, `prd`. `prod` ya no es válido.
- Valor ausente o inválido: error visible (en local, `dev`).

## Checklist para cada cambio

- [ ] ¿Las escrituras nuevas llenan `id`, `reference`, `isActive`, y el código tolera que falten al leer?
- [ ] ¿`reference` y las relaciones son referencias completas del entorno actual, no IDs sueltos?
- [ ] ¿Las lecturas ignoran `isActive === false` y tratan el ausente como activo?
- [ ] ¿Algún flujo borra? Debe ser borrado suave.
- [ ] ¿Las rutas salen del módulo de entorno con `APP_ENV`?
- [ ] ¿El `design.md` de la spec muestra el modelo con los tres campos?
- [ ] Sin escrituras ni migraciones sobre datos reales sin aprobación de Pedro.
