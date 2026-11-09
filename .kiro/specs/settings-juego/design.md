# Diseño — Settings de juego

> **Rutas Firestore (obligatorio):** todo modelo de este módulo vive en `environments/{APP_ENV}/{colección}/{id}`: colección raíz `environments`, un documento por entorno (`dev`, `qa`, `prd`) y dentro todas las colecciones. Cualquier ruta abreviada en este archivo (`kiArenaX/{id}`) cuelga de ese prefijo. Ver `.kiro/steering/reglas-datos.md`.

## Componentes

| Archivo | Rol |
|---|---|
| `public/settings/index.html` | Formulario `#game-settings-form` con inputs `data-stat-multiplier`, contenedores `#power-settings`, `#pending-power-settings`, `#character-settings`, botón `#settings-reset`, estado `#settings-status` |
| `public/src/app/settings-app.js` | `render`, `readForm`, `validate`, `wireEnvironment`, `startSettings` |
| `public/src/config/gameplay-settings.js` | `CHARACTER_OPTIONS`, `DEFAULT_GAME_SETTINGS`, `normalizeGameSettings`, `enabledCharacterRaces` |
| `services/firebase/arena-cloud.js` | `getSettings()` / `saveSettings()` |

## Forma del documento

```json
{
  "version": 1,
  "stats": { "hp": 8, "ki": 1.4, "physicalAttack": 1.35, "physicalDefense": 0.7, "kiDefense": 0.8 },
  "powers": {
    "generic": { "kamehameha": {"start":1.9,"end":4.4}, "makankosappo": {"start":3.2,"end":8.5} },
    "freezer": { "deathRay": {"start":2.6,"end":3.4}, "makankosappo": {"start":3.2,"end":4.2}, "kamehameha": {"start":5.5,"end":7} },
    "pending": { "kiBlast":1, "finalFlash":1, "mafuba":1, "deathBall":1 }
  },
  "characters": { "goku": true, "piccolo": true, "gohan": true, "freezer": true }
}
```

Se guarda serializado en el campo `settingsJson` junto con `id: "gameplay"`, `reference` (referencia completa `…/environments/{APP_ENV}/kiArenaSettings/gameplay`), `isActive: true`, `environment` (`dev|qa|prd`) y `updatedAt`.

## Decisiones

- `normalizeGameSettings` es tolerante: campos faltantes caen al default, así documentos antiguos siguen funcionando.
- `game/arena.js` aún contiene `renderSettingsForm/readGameSettings/validateGameSettings/persistGameSettings/wireSettings` heredados del formulario embebido; en `/` no hay formulario y `wireSettings` sale temprano. Candidato a limpieza.
