// Catálogo de juego de Ki Arena: razas (kiArenaRaces), tipos de personaje
// (kiArenaPlayerTypes) y poderes (kiArenaPowers). Estos valores son los de
// fábrica: se siembran en Firestore y se usan como respaldo si un documento o
// un campo falta. Lo guardado en Firestore siempre gana campo por campo.
// Sin dependencias del navegador: lo importan también los scripts de Node.

// Multiplicador lineal entre el nivel 1 (start) y el nivel 100 (end).
const curve = (start, end = start) => ({ start, end });
const NEUTRAL = Object.freeze({ start: 1, end: 1 });

export const DEFAULT_RACES = Object.freeze([
  {
    code: 'saiyajin', name: 'Saiyajin', legacyRace: 0, color: '#ff9d3d', order: 1,
    stats: { ki: 1.1, physicalAttack: 1.2, physicalDefense: 0.95, kiDefense: 0.9 },
    utility: {
      code: 'zenkai', name: 'Zenkai',
      description: 'Cada derrota le da un bono permanente a todas sus stats, con tope.',
      params: { bonusPerDefeat: 0.03, maxBonus: 0.15 }
    }
  },
  {
    code: 'namekuseijin', name: 'Namekuseijin', legacyRace: 1, color: '#68e47b', order: 2,
    stats: { ki: 1.05, physicalAttack: 0.95, physicalDefense: 1.1, kiDefense: 1.1 },
    utility: {
      code: 'regeneracion', name: 'Regeneración',
      description: 'Fuera de combate recupera un porcentaje de su vida máxima por segundo.',
      params: { regenPerSecond: 0.02, outOfCombatSeconds: 3 }
    }
  },
  {
    code: 'terricola', name: 'Terrícola', legacyRace: 2, color: '#68b9ff', order: 3,
    stats: { ki: 0.95, physicalAttack: 1, physicalDefense: 1, kiDefense: 1 },
    utility: {
      code: 'ingenio', name: 'Ingenio',
      description: 'Gana más experiencia y puede esquivar golpes físicos.',
      params: { xpBonus: 0.2, dodgeChance: 0.08 }
    }
  },
  {
    code: 'freezer', name: 'Freezer', legacyRace: 3, color: '#c487ff', order: 4,
    stats: { ki: 1.25, physicalAttack: 0.95, physicalDefense: 0.95, kiDefense: 1.05 },
    utility: {
      code: 'transformacion', name: 'Transformación',
      description: 'Con poca vida se transforma: más daño durante unos segundos, una vez por vida.',
      params: { hpThreshold: 0.3, damageBonus: 0.25, durationSeconds: 8 }
    }
  }
]);

export const DEFAULT_PLAYER_TYPES = Object.freeze([
  { code: 'goku', name: 'Goku', raceCode: 'saiyajin', legacyRace: 0, isEligible: true, spriteKey: 'goku', order: 1 },
  { code: 'piccolo', name: 'Piccolo', raceCode: 'namekuseijin', legacyRace: 1, isEligible: true, spriteKey: 'piccolo', order: 2 },
  { code: 'gohan', name: 'Gohan', raceCode: 'terricola', legacyRace: 2, isEligible: true, spriteKey: 'gohan', order: 3 },
  { code: 'freezer', name: 'Freezer', raceCode: 'freezer', legacyRace: 3, isEligible: true, spriteKey: 'freezer', order: 4 }
]);

// category: physical | kiBeam | kiArea | control | buff
// engine: mecánica del juego que ejecuta el poder. Solo kamehameha,
// makankosappo y deathRay existen hoy; los demás quedan con status 'pending'
// (registrados y editables, pero sin acción en combate todavía).
const ALL = ['saiyajin', 'namekuseijin', 'terricola'];
const POWER_SPECS = [
  // Implementados (valores tomados del juego actual)
  { code: 'kamehameha', name: 'Kamehameha', races: ALL, category: 'kiBeam', engine: 'kamehameha', command: 'K', unlockLevel: 20, cooldownSeconds: 3.8, chargeSeconds: 0.55, ki: curve(1.9, 4.4), kiDefense: 0.9, physicalDefense: 0.9, baseSizeY: 30, sizeY: curve(1, 2.87), hitbox: 'full', color: '#65e8ff',
    description: 'Onda de ki horizontal. La onda completa es sólida y daña a quien quede dentro.' },
  { code: 'kamehameha', name: 'Kamehameha', races: ['freezer'], category: 'kiBeam', engine: 'kamehameha', command: 'K', unlockLevel: 20, cooldownSeconds: 3.8, chargeSeconds: 0.55, ki: curve(5.5, 7), kiDefense: 0.9, physicalDefense: 0.9, baseSizeY: 6, sizeY: curve(1, 0.5), hitbox: 'full', color: '#65e8ff',
    description: 'Versión de Freezer: más potente y más fina.' },
  { code: 'makankosappo', name: 'Makankosappo', races: ALL, category: 'kiBeam', engine: 'makankosappo', command: 'M', unlockLevel: 10, cooldownSeconds: 7, chargeSeconds: 0.62, ki: curve(3.2, 8.5), kiDefense: 0.8, physicalDefense: 0.8, baseSizeY: 10, sizeY: curve(1, 6.8), hitbox: 'front', color: '#dc9cff',
    description: 'Rayo perforante en espiral que atraviesa a todos en línea.' },
  { code: 'makankosappo', name: 'Makankosappo', races: ['freezer'], category: 'kiBeam', engine: 'makankosappo', command: 'M', unlockLevel: 10, cooldownSeconds: 7, chargeSeconds: 0.62, ki: curve(3.2, 4.2), kiDefense: 0.8, physicalDefense: 0.8, baseSizeY: 8, sizeY: curve(1, 0.625), hitbox: 'front', color: '#dc9cff',
    description: 'Versión de Freezer del rayo perforante.' },
  { code: 'deathRay', name: 'Rayo Mortal', races: ['freezer'], category: 'kiBeam', engine: 'deathRay', command: 'V', unlockLevel: 1, cooldownSeconds: 1.8, chargeSeconds: 0.24, ki: curve(2.6, 3.4), baseSizeY: 10, sizeY: curve(1, 0.7), hitbox: 'front', color: '#ff48d7',
    description: 'Rayo rápido desde un dedo, con enfriamiento corto.' },
  // Pendientes de mecánica: físicos y combos
  { code: 'dragonFist', name: 'Puño del Dragón', races: ['saiyajin'], category: 'physical', unlockLevel: 35, cooldownSeconds: 9, physicalAttack: curve(2.5, 6), physicalDefense: 0.9, hitbox: 'front', description: 'Puñetazo que atraviesa a varios en línea.' },
  { code: 'meteorCombo', name: 'Combo Meteoro', races: ['saiyajin'], category: 'physical', unlockLevel: 15, cooldownSeconds: 6, physicalAttack: curve(2, 5), physicalDefense: 1.1, hitbox: 'contact', description: 'Cadena de 4 golpes que lanza al rival.' },
  { code: 'janKen', name: 'Jan Ken', races: ['terricola'], category: 'physical', unlockLevel: 5, cooldownSeconds: 4, physicalAttack: curve(1.6, 3.5), hitbox: 'contact', description: 'Piedra, papel y tijera: 3 golpes rápidos.' },
  { code: 'wolfFangFist', name: 'Puño del Lobo', races: ['terricola'], category: 'physical', unlockLevel: 12, cooldownSeconds: 6, physicalAttack: curve(1.8, 4.2), physicalDefense: 0.9, hitbox: 'contact', description: 'Combo largo; más probabilidad de esquivar mientras dura.' },
  { code: 'elasticArm', name: 'Brazo Elástico', races: ['namekuseijin'], category: 'physical', unlockLevel: 8, cooldownSeconds: 5, physicalAttack: curve(1.5, 3.8), physicalDefense: 1.1, hitbox: 'front', description: 'Agarra a distancia y acerca al rival.' },
  { code: 'tailWhip', name: 'Latigazo de Cola', races: ['freezer'], category: 'physical', unlockLevel: 6, cooldownSeconds: 4, physicalAttack: curve(1.7, 4), hitbox: 'area', description: 'Golpea alrededor y empuja.' },
  { code: 'rush', name: 'Embestida', races: [...ALL, 'freezer'], category: 'physical', unlockLevel: 3, cooldownSeconds: 4, physicalAttack: curve(1.4, 3), physicalDefense: 1.2, hitbox: 'contact', description: 'Entra a un duelo cuerpo a cuerpo de inmediato.' },
  // Pendientes: ki en rayo
  { code: 'galickGun', name: 'Galick Ho', races: ['saiyajin'], category: 'kiBeam', unlockLevel: 25, cooldownSeconds: 5, ki: curve(2.2, 5), kiDefense: 0.9, physicalDefense: 0.9, hitbox: 'full', color: '#b46bff', description: 'Onda de ki ancha y violeta.' },
  { code: 'finalFlash', name: 'Resplandor Final', races: ['saiyajin'], category: 'kiBeam', unlockLevel: 60, cooldownSeconds: 14, chargeSeconds: 1.8, ki: curve(3.5, 9), kiDefense: 0.6, physicalDefense: 0.6, baseSizeY: 40, sizeY: curve(1, 3.5), hitbox: 'full', color: '#fff27a', description: 'Carga larga y muy expuesta; onda enorme.' },
  { code: 'masenko', name: 'Masenko', races: ['terricola'], category: 'kiBeam', unlockLevel: 18, cooldownSeconds: 4.5, ki: curve(2, 4.6), hitbox: 'front', color: '#ffe066', description: 'Rayo de carga corta desde la frente.' },
  { code: 'triBeam', name: 'Kikoho', races: ['terricola'], category: 'kiArea', unlockLevel: 40, cooldownSeconds: 10, ki: curve(3, 7), kiDefense: 0.8, physicalDefense: 0.8, hitbox: 'area', color: '#ffd23f', description: 'Golpe de área que cuesta un porcentaje de su propia vida.',
    utility: { code: 'selfDamage', name: 'Sacrificio', description: 'Pierde parte de su vida al lanzarlo.', params: { selfHpCost: 0.1 } } },
  // Pendientes: ki en área y esferas
  { code: 'spiritBomb', name: 'Genkidama', races: ['saiyajin'], category: 'kiArea', unlockLevel: 80, cooldownSeconds: 30, chargeSeconds: 4, ki: curve(4, 10), kiDefense: 0.5, physicalDefense: 0.5, baseSizeY: 80, sizeY: curve(1, 4), baseSizeX: 80, sizeX: curve(1, 4), hitbox: 'area', color: '#7fe3ff', description: 'Carga muy larga; crece con la energía del chat.',
    utility: { code: 'chatCharge', name: 'Energía del chat', description: 'Cada mensaje del chat durante la carga suma poder.', params: { bonusPerMessage: 0.02, maxBonus: 1 } } },
  { code: 'bigBangAttack', name: 'Ataque Big Bang', races: ['saiyajin'], category: 'kiArea', unlockLevel: 45, cooldownSeconds: 9, ki: curve(2.8, 6.5), kiDefense: 0.9, physicalDefense: 0.9, hitbox: 'area', color: '#8fd8ff', description: 'Esfera que explota al impactar.' },
  { code: 'deathBall', name: 'Supernova', races: ['freezer'], category: 'kiArea', unlockLevel: 70, cooldownSeconds: 25, chargeSeconds: 3, ki: curve(3.8, 9.5), kiDefense: 0.6, physicalDefense: 0.6, baseSizeY: 70, sizeY: curve(1, 4), baseSizeX: 70, sizeX: curve(1, 4), hitbox: 'area', color: '#ff6b3d', description: 'Esfera gigante, lenta y aplastante.' },
  { code: 'hellzoneGrenade', name: 'Granada Infernal', races: ['namekuseijin'], category: 'kiArea', unlockLevel: 30, cooldownSeconds: 10, ki: curve(2.4, 5.8), hitbox: 'area', color: '#9dff6b', description: 'Esferas que rodean al rival y se cierran.' },
  { code: 'kiBlast', name: 'Ráfaga de Ki', races: [...ALL, 'freezer'], category: 'kiBeam', command: 'B', unlockLevel: 1, cooldownSeconds: 2.5, ki: curve(1.2, 2.6), hitbox: 'front', color: '#ffe9a3', description: 'Muchos disparos pequeños seguidos.' },
  { code: 'explosiveWave', name: 'Onda Explosiva', races: [...ALL, 'freezer'], category: 'kiArea', unlockLevel: 22, cooldownSeconds: 8, ki: curve(1.5, 3.2), kiDefense: 1.2, physicalDefense: 1.2, hitbox: 'area', color: '#fff6d6', description: 'Aleja a todos alrededor.' },
  // Pendientes: utilidad y control
  { code: 'destructoDisc', name: 'Kienzan', races: ['terricola'], category: 'kiBeam', unlockLevel: 28, cooldownSeconds: 8, ki: curve(2.5, 6), hitbox: 'front', color: '#ffe36b', description: 'Disco cortante que ignora la defensa física.',
    utility: { code: 'ignoreDefense', name: 'Corte', description: 'Ignora la defensa física del objetivo.', params: { ignorePhysicalDefense: 1 } } },
  { code: 'deathSaucer', name: 'Disco Mortal', races: ['freezer'], category: 'kiBeam', unlockLevel: 35, cooldownSeconds: 9, ki: curve(2.2, 5.2), hitbox: 'front', color: '#ff8de6', description: 'Disco que persigue al objetivo.' },
  { code: 'solarFlare', name: 'Taiyoken', races: ['terricola'], category: 'control', unlockLevel: 10, cooldownSeconds: 15, ki: curve(0, 0), hitbox: 'area', color: '#fffbe0', description: 'Ciega a los rivales: fallan sus golpes.',
    utility: { code: 'blind', name: 'Ceguera', description: 'Los rivales cercanos fallan durante unos segundos.', params: { durationSeconds: 2, radius: 160 } } },
  { code: 'mafuba', name: 'Mafuba', races: ['terricola'], category: 'control', unlockLevel: 75, cooldownSeconds: 40, ki: curve(0, 0), kiDefense: 0.5, physicalDefense: 0.5, hitbox: 'front', color: '#9cf0ff', description: 'Sella al rival unos segundos; cuesta mucha vida.',
    utility: { code: 'seal', name: 'Sello', description: 'Saca al rival del combate un tiempo.', params: { durationSeconds: 5, selfHpCost: 0.35 } } },
  { code: 'telekinesis', name: 'Telequinesis', races: ['freezer'], category: 'control', unlockLevel: 15, cooldownSeconds: 10, ki: curve(0.8, 1.8), hitbox: 'front', color: '#d9a6ff', description: 'Inmoviliza al rival y lo lanza.',
    utility: { code: 'stun', name: 'Inmovilizar', description: 'El rival no se mueve durante unos segundos.', params: { durationSeconds: 1.5 } } },
  { code: 'kaioken', name: 'Kaioken', races: ['saiyajin', 'terricola'], category: 'buff', unlockLevel: 30, cooldownSeconds: 20, ki: curve(1.3, 2), physicalAttack: curve(1.3, 2), kiDefense: 0.8, physicalDefense: 0.8, hitbox: 'none', color: '#ff3b3b', description: 'Mejora temporal de stats que cuesta vida por segundo.',
    utility: { code: 'buff', name: 'Aumento', description: 'Multiplica las stats mientras dura y quema vida.', params: { durationSeconds: 8, hpCostPerSecond: 0.02 } } },
  // Agregados (Pedro, 2026-10-24)
  { code: 'finalExplosion', name: 'Explosión Final', races: ['saiyajin'], category: 'kiArea', unlockLevel: 85, cooldownSeconds: 60, chargeSeconds: 2, ki: curve(5, 12), kiDefense: 0.3, physicalDefense: 0.3, baseSizeY: 120, sizeY: curve(1, 4), baseSizeX: 120, sizeX: curve(1, 4), hitbox: 'area', color: '#fff3b0', description: 'Explosión que cubre casi toda la pantalla a costa de casi toda su vida.',
    utility: { code: 'selfDamage', name: 'Sacrificio', description: 'Pierde gran parte de su vida al lanzarlo.', params: { selfHpCost: 0.8 } } },
  { code: 'burningAttack', name: 'Ataque Ardiente', races: ['saiyajin'], category: 'kiArea', unlockLevel: 32, cooldownSeconds: 8, ki: curve(2.4, 5.5), baseSizeY: 50, sizeY: curve(1, 2.5), baseSizeX: 50, sizeX: curve(1, 2.5), hitbox: 'area', color: '#ffb347', description: 'Esfera de fuego que explota al impactar.' },
  { code: 'superSaiyan', name: 'Súper Saiyajin', races: ['saiyajin'], category: 'buff', unlockLevel: 50, cooldownSeconds: 60, ki: curve(1.5, 2.5), physicalAttack: curve(1.5, 2.5), kiDefense: 1.2, physicalDefense: 1.2, hitbox: 'none', color: '#ffe14d', description: 'Transformación dorada: multiplica sus stats un tiempo.',
    utility: { code: 'buff', name: 'Aumento', description: 'Multiplica las stats mientras dura.', params: { durationSeconds: 15, hpCostPerSecond: 0 } } },
  { code: 'instantTransmission', name: 'Teletransportación', races: ['saiyajin'], category: 'control', unlockLevel: 40, cooldownSeconds: 12, ki: curve(0, 0), hitbox: 'none', color: '#bfe9ff', description: 'Aparece junto al rival y lo golpea por sorpresa.',
    utility: { code: 'teleport', name: 'Teletransporte', description: 'Se mueve al lado del objetivo al instante.', params: { range: 400 } } },
  { code: 'lightGrenade', name: 'Granada de Luz', races: ['namekuseijin'], category: 'kiArea', unlockLevel: 45, cooldownSeconds: 12, ki: curve(2.6, 6), baseSizeY: 70, sizeY: curve(1, 2.5), baseSizeX: 70, sizeX: curve(1, 2.5), hitbox: 'area', color: '#c6ff8a', description: 'Esfera de luz que estalla en un área grande.' },
  { code: 'makosen', name: 'Makosen', races: ['namekuseijin'], category: 'kiBeam', unlockLevel: 14, cooldownSeconds: 5, ki: curve(1.8, 4.2), hitbox: 'front', color: '#ffd84d', description: 'Ráfaga de ki ancha lanzada con ambas manos.' },
  { code: 'eyeLaser', name: 'Rayo de los Ojos', races: ['namekuseijin'], category: 'kiBeam', unlockLevel: 4, cooldownSeconds: 3, ki: curve(1.1, 2.4), baseSizeY: 6, sizeY: curve(1, 2), hitbox: 'front', color: '#ff6b6b', description: 'Dos rayos finos y rápidos desde los ojos.' },
  { code: 'dodonRay', name: 'Rayo Dodon', races: ['terricola'], category: 'kiBeam', unlockLevel: 16, cooldownSeconds: 4, ki: curve(2, 4.5), baseSizeY: 8, sizeY: curve(1, 2), hitbox: 'front', color: '#ffe680', description: 'Rayo fino y perforante desde un dedo.' },
  { code: 'sokidan', name: 'Sokidan', races: ['terricola'], category: 'kiBeam', unlockLevel: 20, cooldownSeconds: 7, ki: curve(2, 4.8), hitbox: 'front', color: '#9fe8ff', description: 'Esfera de ki que se guía hacia el objetivo.',
    utility: { code: 'homing', name: 'Guiado', description: 'Persigue al objetivo más cercano.', params: { turnRate: 3 } } },
  { code: 'multiForm', name: 'Multiforma', races: ['terricola'], category: 'control', unlockLevel: 55, cooldownSeconds: 30, ki: curve(0, 0), hitbox: 'none', color: '#ffd9a8', description: 'Se divide en varias copias que atacan a la vez.',
    utility: { code: 'clones', name: 'Copias', description: 'Crea copias que reparten el daño.', params: { copies: 3, damageShare: 0.33, durationSeconds: 8 } } },
  { code: 'zanzoken', name: 'Zanzoken', races: [...ALL, 'freezer'], category: 'control', unlockLevel: 8, cooldownSeconds: 10, ki: curve(0, 0), hitbox: 'none', color: '#e6eefc', description: 'Deja una imagen residual y esquiva el siguiente ataque.',
    utility: { code: 'dodge', name: 'Esquiva', description: 'Alta probabilidad de esquivar durante un instante.', params: { dodgeChance: 0.5, durationSeconds: 1.5 } } },
  { code: 'novaStrike', name: 'Nova Strike', races: ['freezer'], category: 'physical', unlockLevel: 40, cooldownSeconds: 9, physicalAttack: curve(2.4, 5.8), physicalDefense: 1.2, baseSizeY: 50, sizeY: curve(1, 2), baseSizeX: 50, sizeX: curve(1, 2), hitbox: 'contact', color: '#e0a3ff', description: 'Embestida envuelta en ki que arrasa con todo a su paso.' }
];

// Tamaño por categoría. Eje Y: grosor del rayo o alto del área. Eje X: ancho
// del área o alcance del golpe. Los rayos (kiBeam) no usan X: su largo lo da
// el recorrido de izquierda a derecha. tamaño(N) = base × multiplicador(N).
const DEFAULT_SIZE = {
  kiBeam: { baseSizeY: 24, sizeY: curve(1, 2.5) },
  kiArea: { baseSizeY: 60, sizeY: curve(1, 2.5), baseSizeX: 60, sizeX: curve(1, 2.5) },
  physical: { baseSizeY: 30, sizeY: curve(1, 1.5), baseSizeX: 30, sizeX: curve(1, 1.5) },
  control: { baseSizeY: 40, sizeY: curve(1, 1.5), baseSizeX: 40, sizeX: curve(1, 1.5) },
  buff: { baseSizeY: 0, sizeY: curve(1) }
};

const HITBOX_UTILITY = {
  full: params => ({ code: 'persistentDamage', name: 'Daño persistente', description: 'Toda la onda expansiva es un objeto sólido: daña por tick a quien esté dentro.', params: { hitboxMode: 'full', tickDamage: 0.15, tickSeconds: 0.25, lingerSeconds: 0.6, ...params } }),
  front: params => ({ code: 'persistentDamage', name: 'Daño frontal', description: 'Solo el frente que avanza hace daño, una vez por objetivo.', params: { hitboxMode: 'front', ...params } })
};

function buildPower(spec, raceCode, order) {
  const asCurve = value => value === undefined ? { ...NEUTRAL } : typeof value === 'number' ? curve(value) : { ...value };
  const utility = spec.utility || (HITBOX_UTILITY[spec.hitbox] ? HITBOX_UTILITY[spec.hitbox]() : undefined);
  const size = DEFAULT_SIZE[spec.category];
  const usesX = spec.category !== 'kiBeam' && (spec.baseSizeX ?? size.baseSizeX) !== undefined;
  return {
    id: `${raceCode}_${spec.code}`,
    code: spec.code,
    name: spec.name,
    description: spec.description,
    command: spec.command || '',
    raceCode,
    category: spec.category,
    engine: spec.engine || '',
    status: spec.engine ? 'implemented' : 'pending',
    unlockLevel: spec.unlockLevel,
    cooldownSeconds: spec.cooldownSeconds,
    chargeSeconds: spec.chargeSeconds ?? 0.5,
    baseSizeY: spec.baseSizeY ?? size.baseSizeY,
    ...(usesX ? { baseSizeX: spec.baseSizeX ?? size.baseSizeX ?? spec.baseSizeY } : {}),
    multipliers: {
      ki: asCurve(spec.ki),
      physicalAttack: asCurve(spec.physicalAttack),
      kiDefense: asCurve(spec.kiDefense),
      physicalDefense: asCurve(spec.physicalDefense),
      sizeY: asCurve(spec.sizeY ?? size.sizeY),
      ...(usesX ? { sizeX: asCurve(spec.sizeX ?? size.sizeX ?? spec.sizeY) } : {})
    },
    ...(utility ? { utility } : {}),
    hitbox: spec.hitbox || 'front',
    visual: { color: spec.color || '#ffffff', spriteKey: spec.engine || spec.code },
    order
  };
}

export const DEFAULT_POWERS = Object.freeze(POWER_SPECS.flatMap((spec, index) => spec.races.map(raceCode => buildPower(spec, raceCode, index + 1))));

// ---------- Lectura y mezcla con Firestore ----------

// Solo objetos literales; las referencias (FsRef o DocumentReference) se copian tal cual.
const isPlainObject = value => Boolean(value) && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;

// Mezcla profunda: lo guardado gana, lo que falta viene del valor de fábrica.
export function mergeDefaults(fallback, stored) {
  if (!isPlainObject(fallback) || !isPlainObject(stored)) return stored === undefined ? fallback : stored;
  const out = { ...fallback };
  for (const [key, value] of Object.entries(stored)) out[key] = mergeDefaults(fallback[key], value);
  return out;
}

const refCode = ref => (ref && typeof ref.path === 'string' ? ref.path.split('/').pop() : '');

// Construye el catálogo efectivo. stored = { races, playerTypes, powers } con los
// documentos leídos de Firestore (pueden faltar). Los documentos con
// isActive === false quedan fuera; los que no tienen isActive cuentan como activos.
export function buildCatalog(stored = {}) {
  const merge = (defaults, docs, idOf) => {
    const byId = new Map((docs || []).map(doc => [doc.id || doc.code, doc]));
    const out = new Map();
    for (const item of defaults) out.set(idOf(item), mergeDefaults(item, byId.get(idOf(item)) || {}));
    for (const [id, doc] of byId) if (!out.has(id)) out.set(id, doc);
    return [...out.values()].filter(item => item.isActive !== false);
  };
  const races = merge(DEFAULT_RACES, stored.races, r => r.code).map(r => ({ ...r, id: r.id || r.code }));
  const playerTypes = merge(DEFAULT_PLAYER_TYPES, stored.playerTypes, t => t.code).map(t => ({ ...t, id: t.id || t.code, raceCode: refCode(t.raceRef) || t.raceCode }));
  // engine y status los decide el código (si la mecánica existe o no), no el documento:
  // así un poder sembrado como pendiente se activa solo cuando su mecánica se publica.
  const engines = new Map(DEFAULT_POWERS.map(p => [p.id, { engine: p.engine, status: p.status }]));
  const powers = merge(DEFAULT_POWERS, stored.powers, p => p.id).map(p => ({ ...p, ...(engines.get(p.id) || {}), raceCode: refCode(p.raceRef) || p.raceCode }));
  const raceCodes = new Set(races.map(r => r.code));
  return {
    races: races.sort((a, b) => (a.order || 99) - (b.order || 99)),
    playerTypes: playerTypes.filter(t => raceCodes.has(t.raceCode)).sort((a, b) => (a.order || 99) - (b.order || 99)),
    powers: powers.filter(p => raceCodes.has(p.raceCode)).sort((a, b) => (a.order || 99) - (b.order || 99) || a.raceCode.localeCompare(b.raceCode))
  };
}

export const DEFAULT_CATALOG = buildCatalog();

export function raceByCode(catalog, code) {
  return catalog.races.find(r => r.code === code) || null;
}

export function playerTypeByCode(catalog, code) {
  return catalog.playerTypes.find(t => t.code === code) || null;
}

// Tipo de personaje de un jugador: playerTypeRef si existe; si no, el número
// race antiguo (0-3) mapeado por legacyRace.
export function resolvePlayerType(catalog, record = {}) {
  const code = refCode(record.playerTypeRef);
  const byRef = code && playerTypeByCode(catalog, code);
  if (byRef) return byRef;
  const legacy = Number(record.race);
  return catalog.playerTypes.find(t => Number(t.legacyRace) === (Number.isFinite(legacy) ? legacy : 0)) || catalog.playerTypes[0] || null;
}

export function legacyRaceOf(catalog, playerType) {
  const race = playerType && raceByCode(catalog, playerType.raceCode);
  const value = Number(playerType?.legacyRace ?? race?.legacyRace);
  return Number.isFinite(value) ? value : 0;
}

export function eligiblePlayerTypes(catalog) {
  return catalog.playerTypes.filter(t => t.isEligible !== false);
}

const clampLevel = level => Math.max(1, Math.min(100, Math.floor(Number(level) || 1)));

// Valor de una curva {start, end} en un nivel: lineal de N=1 a N=100.
export function curveAt(value, level) {
  if (typeof value === 'number') return value;
  const start = Number(value?.start ?? 1), end = Number(value?.end ?? start);
  return start + (end - start) * (clampLevel(level) - 1) / 99;
}

// Todos los multiplicadores de un poder en un nivel.
export function powerMultipliersAt(power, level) {
  const m = power?.multipliers || {};
  return {
    ki: curveAt(m.ki ?? NEUTRAL, level),
    physicalAttack: curveAt(m.physicalAttack ?? NEUTRAL, level),
    kiDefense: curveAt(m.kiDefense ?? NEUTRAL, level),
    physicalDefense: curveAt(m.physicalDefense ?? NEUTRAL, level),
    sizeY: curveAt(m.sizeY ?? m.size ?? NEUTRAL, level),
    sizeX: curveAt(m.sizeX ?? NEUTRAL, level)
  };
}

// Tamaño del poder (px) en un nivel y un eje: base × multiplicador(N).
// axis 'y' = grosor o alto; 'x' = ancho del área (null en los rayos).
// Documentos antiguos con baseSize/size o width {start, end} siguen funcionando.
export function powerSizeAt(power, level, axis = 'y') {
  const m = power?.multipliers || {};
  if (axis === 'x') {
    return Number(power?.baseSizeX) > 0 ? Number(power.baseSizeX) * curveAt(m.sizeX ?? NEUTRAL, level) : null;
  }
  const base = Number(power?.baseSizeY ?? power?.baseSize);
  if (base > 0) return base * curveAt(m.sizeY ?? m.size ?? NEUTRAL, level);
  if (power?.width) return curveAt(power.width, level);
  return null;
}

// Poderes que puede lanzar un personaje: los activos e implementados de su raza
// con unlockLevel <= nivel, menos los que se le quitaron (fila con
// isActive=false), más los que un operador le dio de otra raza (fila activa).
export function availablePowers(catalog, { raceCode, level }, playerPowerRows = []) {
  const rows = new Map(playerPowerRows.map(row => [refCode(row.powerRef) || row.powerId, row]));
  return catalog.powers.filter(power => {
    if (power.status !== 'implemented' || !power.engine) return false;
    const row = rows.get(power.id);
    if (row && row.isActive === false) return false;
    if (row && row.source && row.source !== 'level') return true;
    return power.raceCode === raceCode && clampLevel(level) >= Number(power.unlockLevel || 1);
  });
}

// Poderes de su raza que ya alcanzó por nivel (para crear su fila en kiArenaPlayerPowers).
export function powersUnlockedByLevel(catalog, { raceCode, level }) {
  return catalog.powers.filter(p => p.raceCode === raceCode && clampLevel(level) >= Number(p.unlockLevel || 1));
}

export function powerForCommand(catalog, fighter, command, rows = []) {
  const cmd = String(command || '').trim().toUpperCase();
  const options = availablePowers(catalog, fighter, rows).filter(p => p.command === cmd);
  return options.find(p => p.raceCode === fighter.raceCode) || options[0] || null;
}

// Motivo por el que un comando no se puede usar ('' = se puede).
export function powerBlockReasonFor(catalog, fighter, command, rows = []) {
  const cmd = String(command || '').trim().toUpperCase();
  if (powerForCommand(catalog, fighter, cmd, rows)) return '';
  const all = catalog.powers.filter(p => p.command === cmd);
  if (!all.length) return '';
  const own = all.find(p => p.raceCode === fighter.raceCode);
  if (!own) {
    const races = [...new Set(all.map(p => raceByCode(catalog, p.raceCode)?.name || p.raceCode))].join(', ');
    return `${all[0].name} solo está disponible para: ${races}.`;
  }
  if (own.status !== 'implemented') return `${own.name} todavía no está disponible en combate.`;
  const row = rows.find(r => (refCode(r.powerRef) || r.powerId) === own.id);
  if (row && row.isActive === false) return `${own.name} fue desactivado para este personaje.`;
  return `${own.name} requiere nivel ${own.unlockLevel}; tu nivel actual es ${clampLevel(fighter.level)}.`;
}

export const POWER_CATEGORY_LABELS = Object.freeze({
  physical: 'Físico y combos', kiBeam: 'Ki · rayo', kiArea: 'Ki · área', control: 'Control', buff: 'Mejora'
});

// Documento listo para guardar en Firestore a partir de un elemento del
// catálogo. ref(kind, id) crea la referencia completa del entorno (navegador o
// Admin SDK). Las relaciones van como referencia (raceRef), no como código.
export function catalogDocument(kind, item, ref) {
  const { raceCode, id, reference, isActive, createdAt, updatedAt, ...rest } = item;
  const docId = kind === 'powers' ? item.id : item.code;
  return {
    id: docId,
    reference: ref(kind, docId),
    ...rest,
    ...(raceCode ? { raceRef: ref('races', raceCode) } : {})
  };
}
