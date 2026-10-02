export const CHARACTER_OPTIONS = [
  { id: 'goku', name: 'Goku', race: 0, label: 'Saiyajin' },
  { id: 'piccolo', name: 'Piccolo', race: 1, label: 'Namekuseijin' },
  { id: 'gohan', name: 'Gohan', race: 2, label: 'Humano' },
  { id: 'freezer', name: 'Freezer', race: 3, label: 'Freezer' }
];

export const DEFAULT_GAME_SETTINGS = {
  stats: { hp: 8, ki: 1.4, physicalAttack: 1.35, physicalDefense: 0.7, kiDefense: 0.8 },
  powers: {
    generic: {
      kamehameha: { start: 1.9, end: 4.4 },
      makankosappo: { start: 3.2, end: 8.5 }
    },
    freezer: {
      deathRay: { start: 2.6, end: 3.4 },
      makankosappo: { start: 3.2, end: 4.2 },
      kamehameha: { start: 5.5, end: 7 }
    },
    pending: { kiBlast: 1, finalFlash: 1, mafuba: 1, deathBall: 1 }
  },
  characters: { goku: true, piccolo: true, gohan: true, freezer: true }
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const number = (value, fallback) => Number.isFinite(Number(value)) ? clamp(Number(value), 0, 100) : fallback;

export function normalizeGameSettings(raw = {}) {
  const stats = raw.stats || {};
  const powers = raw.powers || {};
  const generic = powers.generic || {};
  const freezer = powers.freezer || {};
  const pending = powers.pending || {};
  const characters = raw.characters || {};
  const pair = (source, fallback) => ({
    start: number(source?.start, fallback.start),
    end: number(source?.end, fallback.end)
  });
  const result = {
    version: 1,
    stats: {
      hp: number(stats.hp, DEFAULT_GAME_SETTINGS.stats.hp),
      ki: number(stats.ki, DEFAULT_GAME_SETTINGS.stats.ki),
      physicalAttack: number(stats.physicalAttack, DEFAULT_GAME_SETTINGS.stats.physicalAttack),
      physicalDefense: number(stats.physicalDefense, DEFAULT_GAME_SETTINGS.stats.physicalDefense),
      kiDefense: number(stats.kiDefense, DEFAULT_GAME_SETTINGS.stats.kiDefense)
    },
    powers: {
      generic: {
        kamehameha: pair(generic.kamehameha, DEFAULT_GAME_SETTINGS.powers.generic.kamehameha),
        makankosappo: pair(generic.makankosappo, DEFAULT_GAME_SETTINGS.powers.generic.makankosappo)
      },
      freezer: {
        deathRay: pair(freezer.deathRay, DEFAULT_GAME_SETTINGS.powers.freezer.deathRay),
        makankosappo: pair(freezer.makankosappo, DEFAULT_GAME_SETTINGS.powers.freezer.makankosappo),
        kamehameha: pair(freezer.kamehameha, DEFAULT_GAME_SETTINGS.powers.freezer.kamehameha)
      },
      pending: {
        kiBlast: number(pending.kiBlast, DEFAULT_GAME_SETTINGS.powers.pending.kiBlast),
        finalFlash: number(pending.finalFlash, DEFAULT_GAME_SETTINGS.powers.pending.finalFlash),
        mafuba: number(pending.mafuba, DEFAULT_GAME_SETTINGS.powers.pending.mafuba),
        deathBall: number(pending.deathBall, DEFAULT_GAME_SETTINGS.powers.pending.deathBall)
      }
    },
    characters: Object.fromEntries(CHARACTER_OPTIONS.map(character => [
      character.id,
      typeof characters[character.id] === 'boolean' ? characters[character.id] : true
    ]))
  };
  return result;
}

export function calculateLevelStats(level, settings) {
  const n = clamp(Math.floor(Number(level) || 1), 1, 100);
  const growth = n - 1;
  return {
    maxHp: 100 + settings.stats.hp * growth,
    ki: 12 + settings.stats.ki * growth,
    physicalAttack: 9 + settings.stats.physicalAttack * growth,
    physicalDefense: 5 + settings.stats.physicalDefense * growth,
    kiDefense: 5 + settings.stats.kiDefense * growth
  };
}

export function powerMultiplierAtLevel(power, race, level, settings) {
  const n = clamp(Math.floor(Number(level) || 1), 1, 100);
  const progress = (n - 1) / 99;
  const group = race === 3 ? settings.powers.freezer : settings.powers.generic;
  const curve = group[power] || settings.powers.freezer[power];
  if (!curve) return 1;
  return curve.start + (curve.end - curve.start) * progress;
}

export function enabledCharacterRaces(settings) {
  return CHARACTER_OPTIONS.filter(character => settings.characters[character.id]).map(character => character.race);
}
