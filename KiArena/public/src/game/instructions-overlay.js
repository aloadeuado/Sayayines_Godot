// Recuadro de instrucciones sobre la arena (HU-ARE-08): cómo entrar, poderes por
// letra, regalos de TikTok, likes, niveles y qué pasa al caer. Los valores salen de
// los ajustes y el catálogo efectivos; se muestra u oculta con I, el botón de la
// leyenda o el menú de la app de escritorio (window.kiArenaInstructions.toggle()).
import { xpForNext, xpForKnockout } from '../config/gameplay-settings.js';
import { eligiblePlayerTypes } from '../config/game-catalog.js';

const STORAGE_KEY = 'kiArena.instructions.visible';
const PAGE_SECONDS = 7;

// Nombre en español de los regalos de TikTok más comunes (TikTok los manda en inglés).
const GIFT_NAMES = {
  'rose': ['Rosa', '🌹'],
  'ice cream cone': ['Helado', '🍦'],
  'tiktok': ['TikTok', '🎵'],
  'gg': ['GG', '🎮'],
  'finger heart': ['Corazón con dedos', '💖'],
  'perfume': ['Perfume', '🧴'],
  'lion': ['León', '🦁'],
  'heart me': ['Corazón', '💗'],
  'doughnut': ['Dona', '🍩'],
  'galaxy': ['Galaxia', '🌌'],
  'universe': ['Universo', '🪐']
};

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const list = names => names.length > 1 ? names.slice(0, -1).join(', ') + ' o ' + names.at(-1) : names[0] || '';

// Requisito de un poder (todas sus filas de raza): nivel mínimo y razas si no son todas.
function requirement(catalog, rows) {
  const level = Math.min(...rows.map(p => Number(p.unlockLevel) || 1));
  const raceCodes = new Set(rows.map(p => p.raceCode));
  const races = catalog.races.filter(r => raceCodes.has(r.code)).map(r => r.name);
  return { level, races: races.length < catalog.races.length ? races : [] };
}

function requirementText({ level, races }) {
  const parts = [];
  if (races.length) parts.push('solo ' + list(races));
  if (level > 1) parts.push('nv ' + level);
  return parts.join(' · ') || 'desde nv 1';
}

const usable = p => p.status === 'implemented' && p.engine && p.isActive !== false;

// Modelo puro (sin DOM) de lo que muestra el recuadro, para probarlo con Node.
export function buildInstructions(settings, catalog) {
  const byCode = new Map();
  for (const p of catalog.powers.filter(usable)) {
    if (!byCode.has(p.code)) byCode.set(p.code, []);
    byCode.get(p.code).push(p);
  }
  const letters = [...byCode.values()]
    .filter(rows => rows[0].command)
    .map(rows => ({ key: rows[0].command, name: rows[0].name, ...requirement(catalog, rows) }))
    .sort((a, b) => a.level - b.level || a.key.localeCompare(b.key));
  const gifts = (settings.tiktok?.gifts || [])
    .filter(g => g.isActive !== false && byCode.has(g.powerCode))
    .map(g => {
      const [name, icon] = GIFT_NAMES[g.giftName.trim().toLowerCase()] || [g.giftName || 'Regalo', '🎁'];
      const rows = byCode.get(g.powerCode);
      return { name, icon, coins: g.coins, power: rows[0].name, ...requirement(catalog, rows) };
    })
    .sort((a, b) => a.coins - b.coins);
  const fallback = byCode.get('kiBlast')?.[0]?.name || '';
  return {
    characters: eligiblePlayerTypes(catalog).map(t => t.name),
    letters,
    gifts,
    fallback,
    likeHealHp: Number(settings.tiktok?.likeHealHp) || 0,
    rejoinSeconds: Number(settings.rejoinCooldownSeconds ?? 10),
    xpBonus: catalog.races.filter(r => Number(r.utility?.params?.xpBonus) > 0).map(r => ({ race: r.name, percent: Math.round(r.utility.params.xpBonus * 100) })),
    xp: { perKnockout: 2 * xpForKnockout(1) - xpForKnockout(2), perRivalLevel: xpForKnockout(2) - xpForKnockout(1), firstLevel: xpForNext(1), tenthLevel: xpForNext(10), maxLevel: 100 }
  };
}

function pages(m) {
  const key = k => `<kbd>${escapeHtml(k)}</kbd>`;
  const out = [];
  out.push({ title: 'Cómo entrar', body: `<ol>
    <li>Escribe ${key('E')} en el chat del live.</li>
    <li>Entras con tu cuenta de TikTok y te toca un guerrero al azar${m.characters.length ? ': ' + escapeHtml(list(m.characters)) : ''}.</li>
    <li>Tu guerrero pelea solo; tú lanzas los poderes.</li></ol>` });
  if (m.letters.length) out.push({ title: 'Poderes: escribe la letra', body: `<ul class="arena-help-grid">${m.letters.map(l =>
    `<li>${key(l.key)}<span>${escapeHtml(l.name)}<small>${escapeHtml(requirementText(l))}</small></span></li>`).join('')}</ul>` });
  if (m.gifts.length) out.push({ title: 'Regalos = poderes al instante', body: `<ul class="arena-help-rows">${m.gifts.map(g =>
    `<li><b class="arena-help-icon">${g.icon}</b><span>${escapeHtml(g.name)} → <b>${escapeHtml(g.power)}</b>${g.level > 1 || g.races.length ? ` <small>${escapeHtml(requirementText(g))}</small>` : ''}</span></li>`).join('')}</ul>
    ${m.fallback ? `<p class="arena-help-note">Sin esperas. Si aún no tienes el nivel, sale ${escapeHtml(m.fallback)}. Si no estás dentro, el regalo te hace entrar.</p>` : ''}` });
  out.push({ title: 'Likes y niveles', body: `<ul>
    ${m.likeHealHp > 0 ? `<li>❤️ Cada like te cura <b>+${m.likeHealHp} HP</b>.</li>` : ''}
    <li>⭐ Derrota rivales: <b>+${m.xp.perKnockout} XP</b> y +${m.xp.perRivalLevel} por cada nivel del rival${m.xpBonus.length ? ' (' + escapeHtml(m.xpBonus.map(b => b.race + ' +' + b.percent + ' %').join(', ')) + ')' : ''}.</li>
    <li>📈 Del nv 1 al 2: ${m.xp.firstLevel} XP; del 10 al 11: ${m.xp.tenthLevel} XP. Más nivel = más vida, daño y poderes (máx. ${m.xp.maxLevel}).</li></ul>` });
  out.push({ title: 'Si caes', body: `<ul>
    <li>💥 Con 0 HP sales de la arena.</li>
    <li>⏱️ A los ${m.rejoinSeconds} s vuelve a escribir ${key('E')}: regresas con tu nivel y tu XP.</li></ul>` });
  return out;
}

function readVisible() {
  try { return localStorage.getItem(STORAGE_KEY) !== '0'; } catch { return true; }
}

function saveVisible(visible) {
  try { localStorage.setItem(STORAGE_KEY, visible ? '1' : '0'); } catch { /* sin almacenamiento: solo esta sesión */ }
}

export function createInstructionsOverlay(root = document.querySelector('#arena-help')) {
  if (!root) return { update() {}, toggle() {}, set() {} };
  const button = document.querySelector('#instructions-toggle');
  let list = [], index = 0, timer = null;
  const render = () => {
    const page = list[index % list.length];
    if (!page) return;
    root.innerHTML = `<header><b>Juega con nosotros</b><span>escribe <kbd>E</kbd> en el chat para entrar con tu cuenta de TikTok</span></header>
      <section><h2>${escapeHtml(page.title)}</h2>${page.body}</section>
      <footer>${list.map((_, i) => `<i${i === index % list.length ? ' class="on"' : ''}></i>`).join('')}</footer>`;
  };
  const set = visible => {
    root.hidden = !visible;
    saveVisible(visible);
    button?.setAttribute('aria-pressed', String(visible));
    clearInterval(timer);
    if (visible) timer = setInterval(() => { index += 1; render(); }, PAGE_SECONDS * 1000);
  };
  const api = {
    update(settings, catalog) { list = pages(buildInstructions(settings, catalog)); render(); },
    toggle() { set(root.hidden); },
    set
  };
  if (button) button.onclick = api.toggle;
  document.addEventListener('keydown', e => {
    if (e.key.toLowerCase() !== 'i' || e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName || '')) return;
    api.toggle();
  });
  set(readVisible());
  window.kiArenaInstructions = api;
  return api;
}
