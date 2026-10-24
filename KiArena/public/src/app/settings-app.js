import { DEFAULT_GAME_SETTINGS, normalizeGameSettings } from '../config/gameplay-settings.js';
import { DEFAULT_CATALOG, DEFAULT_POWERS, DEFAULT_RACES, DEFAULT_PLAYER_TYPES, buildCatalog, POWER_CATEGORY_LABELS } from '../config/game-catalog.js';

const $ = selector => document.querySelector(selector);
let settings = normalizeGameSettings(DEFAULT_GAME_SETTINGS);
let catalog = DEFAULT_CATALOG;

const STAT_LABELS = [['ki', 'Ki'], ['physicalAttack', 'Daño físico'], ['physicalDefense', 'Defensa física'], ['kiDefense', 'Defensa de ki']];
const MULTIPLIER_LABELS = [['ki', 'Ki'], ['physicalAttack', 'Daño físico'], ['kiDefense', 'Defensa de ki'], ['physicalDefense', 'Defensa física'], ['size', 'Tamaño eje Y']];
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const num = (attrs, value, step = '0.01') => `<input type="number" min="0" max="100" step="${step}" ${attrs} value="${escape(value)}">`;

function status(message, kind = '') {
  const element = $('#settings-status');
  element.textContent = message;
  element.dataset.state = kind;
}

function renderRaces() {
  $('#race-settings').innerHTML = catalog.races.map(race => `<section class="power-settings-group race-setting" data-race="${escape(race.code)}">
    <h4 style="color:${escape(race.color)}">${escape(race.name)}</h4>
    <div class="settings-grid">${STAT_LABELS.map(([key, label]) => `<label><span>${label}</span><small>× sobre la fórmula por nivel</small>${num(`data-race-stat="${key}"`, race.stats?.[key] ?? 1)}</label>`).join('')}</div>
    <div class="power-setting"><strong>Utilidad: ${escape(race.utility?.name || '—')}</strong><small>${escape(race.utility?.description || '')}</small>
      <div class="power-setting-pair">${Object.entries(race.utility?.params || {}).map(([key, value]) => `<label>${escape(key)}${num(`data-race-param="${escape(key)}"`, value, '0.001')}</label>`).join('')}</div>
    </div>
  </section>`).join('');
}

function powerCard(power) {
  const m = power.multipliers || {};
  const params = power.utility?.params || {};
  const badge = power.status === 'implemented' ? '<em class="power-badge ok">Activo en combate</em>' : '<em class="power-badge">Pendiente de mecánica</em>';
  return `<details class="power-setting power-card" data-power="${escape(power.id)}">
    <summary><strong>${escape(power.name)}</strong> ${power.command ? `<code>${escape(power.command)}</code>` : ''} ${badge}<small>${escape(POWER_CATEGORY_LABELS[power.category] || power.category)} · nivel ${escape(power.unlockLevel)} · ${escape(power.cooldownSeconds)} s</small></summary>
    <small>${escape(power.description)}</small>
    <div class="power-setting-pair">
      <label>Nivel de desbloqueo${num('data-power-field="unlockLevel"', power.unlockLevel, '1')}</label>
      <label>Enfriamiento (s)${num('data-power-field="cooldownSeconds"', power.cooldownSeconds, '0.1')}</label>
      <label>Tamaño base eje Y (px)${num('data-power-field="baseSize"', power.baseSize ?? 0, '1')}</label>
    </div>
    ${MULTIPLIER_LABELS.map(([key, label]) => `<div class="power-setting-pair"><label>${label} · N=1${num(`data-power-mult="${key}" data-bound="start"`, m[key]?.start ?? 1)}</label><label>${label} · N=100${num(`data-power-mult="${key}" data-bound="end"`, m[key]?.end ?? 1)}</label></div>`).join('')}
    ${params.hitboxMode ? `<div class="power-setting-pair">
      <label>Hitbox<select data-power-param="hitboxMode"><option value="front" ${params.hitboxMode === 'front' ? 'selected' : ''}>Solo el frente</option><option value="full" ${params.hitboxMode === 'full' ? 'selected' : ''}>Toda la onda</option></select></label>
      ${['tickDamage', 'tickSeconds', 'lingerSeconds'].map(key => `<label>${key}${num(`data-power-param="${key}"`, params[key] ?? 0, '0.01')}</label>`).join('')}
    </div>` : Object.keys(params).length ? `<div class="power-setting-pair">${Object.entries(params).map(([key, value]) => `<label>${escape(key)}${num(`data-power-param="${escape(key)}"`, value, '0.01')}</label>`).join('')}</div>` : ''}
  </details>`;
}

function renderPowers() {
  $('#power-settings').innerHTML = catalog.races.map(race => {
    const powers = catalog.powers.filter(p => p.raceCode === race.code);
    return `<section class="power-settings-group"><h4 style="color:${escape(race.color)}">${escape(race.name)} · ${powers.length} poderes</h4>${powers.map(powerCard).join('')}</section>`;
  }).join('');
}

function renderCharacters() {
  $('#character-settings').innerHTML = catalog.playerTypes.map(type => {
    const race = catalog.races.find(r => r.code === type.raceCode);
    return `<label class="character-setting"><span>${escape(type.name)} · ${escape(race?.name || type.raceCode)}</span><input type="checkbox" data-player-type="${escape(type.code)}" ${type.isEligible !== false ? 'checked' : ''}></label>`;
  }).join('');
}

function render() {
  document.querySelectorAll('[data-stat-multiplier]').forEach(input => { input.value = settings.stats[input.dataset.statMultiplier]; });
  renderRaces();
  renderPowers();
  renderCharacters();
}

// Lee el formulario y devuelve los cambios por documento de catálogo.
function readForm() {
  const nextSettings = structuredClone(settings);
  document.querySelectorAll('[data-stat-multiplier]').forEach(input => { nextSettings.stats[input.dataset.statMultiplier] = Number(input.value); });
  const races = catalog.races.map(race => {
    const box = document.querySelector(`[data-race="${race.code}"]`);
    const stats = { ...race.stats }, params = { ...(race.utility?.params || {}) };
    box.querySelectorAll('[data-race-stat]').forEach(input => { stats[input.dataset.raceStat] = Number(input.value); });
    box.querySelectorAll('[data-race-param]').forEach(input => { params[input.dataset.raceParam] = Number(input.value); });
    return { id: race.code, data: { stats, utility: { ...race.utility, params } } };
  });
  const powers = catalog.powers.map(power => {
    const box = document.querySelector(`[data-power="${power.id}"]`);
    const multipliers = structuredClone(power.multipliers || {});
    box.querySelectorAll('[data-power-mult]').forEach(input => {
      multipliers[input.dataset.powerMult] = { ...(multipliers[input.dataset.powerMult] || {}), [input.dataset.bound]: Number(input.value) };
    });
    const params = { ...(power.utility?.params || {}) };
    box.querySelectorAll('[data-power-param]').forEach(input => { params[input.dataset.powerParam] = input.tagName === 'SELECT' ? input.value : Number(input.value); });
    const field = name => Number(box.querySelector(`[data-power-field="${name}"]`).value);
    return { id: power.id, data: { unlockLevel: Math.round(field('unlockLevel')), cooldownSeconds: field('cooldownSeconds'), baseSize: field('baseSize'), multipliers, ...(power.utility ? { utility: { ...power.utility, params } } : {}) } };
  });
  const playerTypes = catalog.playerTypes.map(type => ({ id: type.code, data: { isEligible: document.querySelector(`[data-player-type="${type.code}"]`).checked } }));
  return { settings: normalizeGameSettings(nextSettings), races, powers, playerTypes };
}

function validate(next) {
  if (!next.playerTypes.some(t => t.data.isEligible)) return 'Activa al menos un personaje elegible.';
  for (const race of next.races) {
    if (Object.values(race.data.stats).some(v => !Number.isFinite(v) || v < 0)) return `Revisa los multiplicadores de la raza ${race.id}.`;
  }
  for (const power of next.powers) {
    const { unlockLevel, cooldownSeconds, multipliers } = power.data;
    if (!(unlockLevel >= 1 && unlockLevel <= 100)) return `${power.id}: el nivel de desbloqueo debe estar entre 1 y 100.`;
    if (!(cooldownSeconds >= 0)) return `${power.id}: el enfriamiento no puede ser negativo.`;
    if (Object.values(multipliers).some(c => !(c.start >= 0 && c.end >= 0))) return `${power.id}: los multiplicadores no pueden ser negativos.`;
  }
  return '';
}

// Guarda solo los documentos que cambiaron respecto a lo cargado.
async function saveChanges(next) {
  const current = { races: new Map(catalog.races.map(r => [r.code, r])), powers: new Map(catalog.powers.map(p => [p.id, p])), playerTypes: new Map(catalog.playerTypes.map(t => [t.code, t])) };
  // Firestore devuelve los mapas con las llaves en otro orden: se comparan ordenadas.
  const stable = value => JSON.stringify(value, (key, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v));
  const changed = (kind, item) => Object.entries(item.data).some(([key, value]) => stable(current[kind].get(item.id)?.[key]) !== stable(value));
  const writes = [];
  for (const kind of ['races', 'powers', 'playerTypes']) {
    for (const item of next[kind]) if (changed(kind, item)) writes.push(window.kiArenaCloud.saveCatalogDoc(kind, item.id, item.data, current[kind].get(item.id)));
  }
  await window.kiArenaCloud.saveSettings(next.settings);
  await Promise.all(writes);
  return writes.length;
}

async function load() {
  settings = normalizeGameSettings(await window.kiArenaCloud.getSettings() || DEFAULT_GAME_SETTINGS);
  catalog = buildCatalog(await window.kiArenaCloud.listCatalog());
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
  // La validación la hace validate(): los campos dentro de poderes plegados no pueden recibir foco.
  $('#game-settings-form').noValidate = true;
  try {
    await load();
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
      const count = await saveChanges(next);
      await load();
      render();
      status(`Ajustes guardados en Firebase · ${window.KI_ARENA_FIREBASE.environment.toUpperCase()} · ${count} registros del catálogo actualizados.`, 'ok');
    } catch (error) {
      status(`No se pudieron guardar los ajustes: ${error.message}`, 'error');
    }
  });
  $('#settings-reset').addEventListener('click', async () => {
    try {
      const factory = buildCatalog();
      await window.kiArenaCloud.saveSettings(normalizeGameSettings(DEFAULT_GAME_SETTINGS));
      await Promise.all([
        ...DEFAULT_RACES.map(r => window.kiArenaCloud.saveCatalogDoc('races', r.code, { stats: r.stats, utility: r.utility }, r)),
        ...DEFAULT_POWERS.map(p => window.kiArenaCloud.saveCatalogDoc('powers', p.id, { unlockLevel: p.unlockLevel, cooldownSeconds: p.cooldownSeconds, baseSize: p.baseSize, multipliers: p.multipliers, ...(p.utility ? { utility: p.utility } : {}) }, p)),
        ...DEFAULT_PLAYER_TYPES.map(t => window.kiArenaCloud.saveCatalogDoc('playerTypes', t.code, { isEligible: t.isEligible }, t))
      ]);
      await load();
      render();
      status(`Se restauraron y guardaron los valores iniciales (${factory.powers.length} poderes).`, 'ok');
    } catch (error) {
      status(`No se pudieron guardar los valores iniciales: ${error.message}`, 'error');
    }
  });
}
