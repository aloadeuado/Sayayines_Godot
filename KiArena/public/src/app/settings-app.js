import { CHARACTER_OPTIONS, DEFAULT_GAME_SETTINGS, enabledCharacterRaces, normalizeGameSettings } from '../config/gameplay-settings.js';

const $ = selector => document.querySelector(selector);
let settings = normalizeGameSettings(DEFAULT_GAME_SETTINGS);

function status(message, kind = '') {
  const element = $('#settings-status');
  element.textContent = message;
  element.dataset.state = kind;
}

function render() {
  document.querySelectorAll('[data-stat-multiplier]').forEach(input => {
    input.value = settings.stats[input.dataset.statMultiplier];
  });
  const groups = [
    { scope: 'generic', title: 'Razas distintas de Freezer', powers: [['kamehameha', 'Kamehameha'], ['makankosappo', 'Makankosappo']] },
    { scope: 'freezer', title: 'Freezer', powers: [['deathRay', 'Rayo Mortal'], ['makankosappo', 'Makankosappo'], ['kamehameha', 'Kamehameha']] }
  ];
  $('#power-settings').innerHTML = groups.map(group => `<section class="power-settings-group"><h3>${group.title}</h3>${group.powers.map(([key, name]) => {
    const curve = settings.powers[group.scope][key];
    return `<div class="power-setting"><strong>${name}</strong><small>Multiplicador de Ataque de Ki desde N=1 hasta N=100</small><div class="power-setting-pair"><label>Nivel 1<input type="number" min="0" max="100" step="0.1" data-power-scope="${group.scope}" data-power-key="${key}" data-bound="start" value="${curve.start}"></label><label>Nivel 100<input type="number" min="0" max="100" step="0.1" data-power-scope="${group.scope}" data-power-key="${key}" data-bound="end" value="${curve.end}"></label></div></div>`;
  }).join('')}</section>`).join('');
  $('#pending-power-settings').innerHTML = [['Golpe de ki', 'kiBlast'], ['Destello final', 'finalFlash'], ['Mafuba', 'mafuba'], ['Bola mortal', 'deathBall']].map(([name]) => `<div class="pending-power"><strong>${name}</strong><span>Aún no implementado en combate</span></div>`).join('');
  $('#character-settings').innerHTML = CHARACTER_OPTIONS.map(character => `<label class="character-setting"><span>${character.name} · ${character.label}</span><input type="checkbox" data-character-key="${character.id}" ${settings.characters[character.id] ? 'checked' : ''}></label>`).join('');
}

function readForm() {
  const next = structuredClone(settings);
  document.querySelectorAll('[data-stat-multiplier]').forEach(input => { next.stats[input.dataset.statMultiplier] = Number(input.value); });
  document.querySelectorAll('[data-power-scope]').forEach(input => { next.powers[input.dataset.powerScope][input.dataset.powerKey][input.dataset.bound] = Number(input.value); });
  document.querySelectorAll('[data-character-key]').forEach(input => { next.characters[input.dataset.characterKey] = input.checked; });
  return normalizeGameSettings(next);
}

function validate(next) {
  if (!enabledCharacterRaces(next).length) return 'Activa al menos un personaje elegible.';
  const g = next.powers.generic, f = next.powers.freezer;
  if (!(g.kamehameha.start < g.kamehameha.end && g.makankosappo.start < g.makankosappo.end && f.deathRay.start < f.deathRay.end && f.makankosappo.start < f.makankosappo.end && f.kamehameha.start < f.kamehameha.end)) return 'Cada multiplicador debe crecer desde nivel 1 hasta nivel 100.';
  if (!(g.kamehameha.start < g.makankosappo.start && g.kamehameha.end < g.makankosappo.end)) return 'Para las otras razas, Makankosappo debe superar a Kamehameha.';
  if (!(f.deathRay.start < f.makankosappo.start && f.makankosappo.start < f.kamehameha.start && f.deathRay.end < f.makankosappo.end && f.makankosappo.end < f.kamehameha.end)) return 'Para Freezer, el orden debe ser Rayo Mortal < Makankosappo < Kamehameha.';
  return '';
}

function wireEnvironment() {
  const input = $('#environment-switch');
  input.value = window.KI_ARENA_FIREBASE.environment;
  input.addEventListener('change', () => {
    const url = new URL(location.href);
    if (input.value === 'dev') url.searchParams.delete('env');
    else url.searchParams.set('env', input.value);
    location.assign(url.href);
  });
}

export async function startSettings() {
  wireEnvironment();
  try {
    settings = normalizeGameSettings(await window.kiArenaCloud.getSettings() || DEFAULT_GAME_SETTINGS);
    render();
    status(`Configuración de ${window.KI_ARENA_FIREBASE.environment.toUpperCase()} cargada desde Firebase.`);
  } catch (error) {
    render();
    status(`No se pudieron cargar los ajustes de Firebase: ${error.message}`, 'error');
  }
  $('#game-settings-form').addEventListener('submit', async event => {
    event.preventDefault();
    const next = readForm();
    const problem = validate(next);
    if (problem) return status(problem, 'error');
    try {
      await window.kiArenaCloud.saveSettings(next);
      settings = next;
      render();
      status(`Ajustes guardados en Firebase · ${window.KI_ARENA_FIREBASE.environment.toUpperCase()}.`, 'ok');
    } catch (error) {
      status(`No se pudieron guardar los ajustes: ${error.message}`, 'error');
    }
  });
  $('#settings-reset').addEventListener('click', async () => {
    const next = normalizeGameSettings(DEFAULT_GAME_SETTINGS);
    try {
      await window.kiArenaCloud.saveSettings(next);
      settings = next;
      render();
      status('Se restauraron y guardaron los valores iniciales.', 'ok');
    } catch (error) {
      status(`No se pudieron guardar los valores iniciales: ${error.message}`, 'error');
    }
  });
}
