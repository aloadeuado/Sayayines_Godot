import { calculateLevelStats, DEFAULT_GAME_SETTINGS, normalizeGameSettings, powerBlockReason } from '../config/gameplay-settings.js';

const $ = selector => document.querySelector(selector);
const normalize = value => String(value || '').trim().toLowerCase();
const RACES = [
  { name: 'Saiyajin', color: '#ff9d3d' },
  { name: 'Namekuseijin', color: '#68e47b' },
  { name: 'Humano', color: '#68b9ff' },
  { name: 'Freezer', color: '#c487ff' }
];

let gameplaySettings = normalizeGameSettings(DEFAULT_GAME_SETTINGS);
let cachedPlayers = [];
let selectedPlayerKey = null;

function xpForNext(level) {
  return Math.round(100 + level * 24 + level * level * 1.3);
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function showStatus(message, error = false) {
  const element = $('#bot-status');
  if (!element) return;
  element.textContent = message;
  element.dataset.error = String(error);
}

function wireEnvironment() {
  const select = $('#environment-switch');
  if (!select) return;
  select.value = window.KI_ARENA_FIREBASE.environment;
  select.addEventListener('change', () => {
    const url = new URL(location.href);
    if (select.value === 'dev') url.searchParams.delete('env');
    else url.searchParams.set('env', select.value);
    location.assign(url.href);
  });
}

function renderGlobalMetrics(players) {
  const total = players.length;
  const alive = players.filter(p => p.alive !== false).length;
  const totalKOs = players.reduce((sum, p) => sum + (Number(p.deaths) || 0), 0);
  const maxLevel = players.reduce((max, p) => Math.max(max, Number(p.level) || 1), 1);

  const metricsGrid = $('#global-metrics');
  if (metricsGrid) {
    metricsGrid.innerHTML = `
      <div class="stat">Total luchadores<b>${total}</b></div>
      <div class="stat">Vivos en arena<b>${alive}</b></div>
      <div class="stat">Bajas / KOs<b>${totalKOs}</b></div>
      <div class="stat">Nivel más alto<b>Nv. ${maxLevel}</b></div>
    `;
  }
}

function renderSelectedPlayer() {
  const container = $('#selected');
  const statsBox = $('#stats');
  if (!container || !statsBox) return;

  const player = cachedPlayers.find(p => normalize(p.username) === selectedPlayerKey);
  if (!player) {
    container.innerHTML = '<span class="help">Haz clic en un luchador de la lista para inspeccionar sus métricas detalladas.</span>';
    statsBox.innerHTML = '';
    return;
  }

  const raceIdx = Number(player.race) || 0;
  const race = RACES[raceIdx] || RACES[0];
  const level = Math.max(1, Math.min(100, Number(player.level) || 1));
  const xp = Math.max(0, Number(player.xp) || 0);
  const nextXp = xpForNext(level);
  const kills = Number(player.kills) || 0;
  const deaths = Number(player.deaths) || 0;
  const isAlive = player.alive !== false;

  const stats = calculateLevelStats(level, gameplaySettings);

  container.innerHTML = `
    <b style="color:${race.color}">${escapeHtml(player.username)}</b> · ${race.name} · ${isAlive ? '🟢 En combate' : '💀 KO / En espera'}<br>
    Nivel ${level} · ${Math.floor(xp)}/${nextXp} XP · Victorias: ${kills} · KO: ${deaths}
  `;

  statsBox.innerHTML = `
    <div class="stat">Sangre (HP Máx)<b>${stats.maxHp}</b></div>
    <div class="stat">Ataque de ki<b>${stats.ki.toFixed(1)}</b></div>
    <div class="stat">Ataque físico<b>${stats.physicalAttack.toFixed(2)}</b></div>
    <div class="stat">Defensa física<b>${stats.physicalDefense.toFixed(2)}</b></div>
    <div class="stat">Defensa de ki<b>${stats.kiDefense.toFixed(2)}</b></div>
    <div class="stat">Estado actual<b>${isAlive ? 'Vivo' : 'Eliminado'}</b></div>
  `;
}

function renderRoster(players) {
  cachedPlayers = players;
  const roster = $('#roster');
  if (!roster) return;

  const currentChatUser = normalize($('#chat-user')?.value || '');

  roster.innerHTML = players.map(player => {
    const key = normalize(player.username);
    const raceIdx = Number(player.race) || 0;
    const race = RACES[raceIdx] || RACES[0];
    const level = Math.max(1, Number(player.level) || 1);
    const xp = Math.max(0, Number(player.xp) || 0);
    const stats = calculateLevelStats(level, gameplaySettings);
    const maxHp = stats.maxHp;
    const isAlive = player.alive !== false;
    const hp = isAlive ? Math.max(0, Math.min(maxHp, Number(player.hp) || maxHp)) : 0;
    const percent = Math.min(100, Math.max(0, hp / maxHp * 100));
    const isSelected = selectedPlayerKey === key;
    const isTarget = currentChatUser === key;

    return `
      <article class="fighter ${isSelected ? 'selected' : ''} ${isTarget ? 'chat-target' : ''}" data-player-key="${key}" style="opacity:${isAlive ? 1 : 0.65}; cursor:pointer">
        <i class="dot" style="color:${race.color};background:${race.color}"></i>
        <div class="fighter-info">
          <div class="fighter-name-line">
            <strong>${escapeHtml(player.username)}</strong>
            <button type="button" class="select-chat-user" data-choose-user="${escapeHtml(player.username)}" aria-label="Usar para enviar comandos">${isTarget ? '✓' : 'Elegir'}</button>
          </div>
          <small>${race.name} · Nv. ${level} · ${Number(player.kills) || 0} bajas</small>
          <small>HP ${Math.round(hp)}/${Math.round(maxHp)} · XP ${Math.round(xp)}/${xpForNext(level)} · KO ${Number(player.deaths) || 0}</small>
        </div>
        <div class="bar"><i style="width:${percent}%"></i></div>
        <button class="fighter-entry" data-enter-user="${escapeHtml(player.username)}" ${isAlive ? 'disabled' : ''}>${isAlive ? 'Dentro' : 'Ingresar'}</button>
      </article>
    `;
  }).join('') || '<p class="help">Aún no hay luchadores registrados en Firestore.</p>';

  roster.querySelectorAll('.fighter[data-player-key]').forEach(item => {
    item.addEventListener('click', () => {
      selectedPlayerKey = item.dataset.playerKey;
      renderSelectedPlayer();
      renderRoster(cachedPlayers);
    });
  });

  roster.querySelectorAll('[data-choose-user]').forEach(btn => {
    btn.addEventListener('click', event => {
      event.stopPropagation();
      const name = btn.dataset.chooseUser;
      if ($('#chat-user')) $('#chat-user').value = name;
      showStatus(`Remitente de comandos fijado en @${name}`);
      renderRoster(cachedPlayers);
    });
  });

  roster.querySelectorAll('[data-enter-user]').forEach(btn => {
    btn.addEventListener('click', event => {
      event.stopPropagation();
      const name = btn.dataset.enterUser;
      if ($('#chat-user')) $('#chat-user').value = name;
      sendCommand(name, 'E');
    });
  });

  renderGlobalMetrics(players);
  if (selectedPlayerKey) {
    renderSelectedPlayer();
  }
}

async function loadRoster() {
  const players = await window.kiArenaCloud.listPlayers();
  renderRoster(players);
}

async function refreshChat() {
  const messages = await window.kiArenaCloud.listMessages();
  const log = $('#chat-log');
  if (!log) return;
  const seenEntries = new Set();
  const visibleMessages = [...messages].reverse().filter(message => {
    if (String(message.text || '').trim().toUpperCase() !== 'E') return true;
    const key = normalize(message.username);
    if (seenEntries.has(key)) return false;
    seenEntries.add(key);
    return true;
  }).reverse();
  log.innerHTML = visibleMessages.map(message => {
    const isCmd = /^[EKMV]$/i.test(String(message.text || ''));
    return `
      <div class="chat-line ${isCmd ? 'cmd-line' : ''}">
        <b>${escapeHtml(message.username)}</b>: ${escapeHtml(message.text)}
      </div>
    `;
  }).join('') || '<div class="chat-system">El chat está vacío. Usa los botones para enviar comandos.</div>';
  log.scrollTop = log.scrollHeight;
}

async function refreshCombatFeed() {
  const feed = $('#feed');
  if (!feed || !window.kiArenaCloud.listEvents) return;
  try {
    const events = await window.kiArenaCloud.listEvents();
    if (!events.length) {
      feed.innerHTML = '<div class="help">No hay eventos de combate recientes.</div>';
      return;
    }
    feed.innerHTML = events.map(evt => {
      if (evt.type === 'knockout') {
        return `<div>💀 <b style="color:#75d9ff">${escapeHtml(evt.killer || 'Desconocido')}</b> derrotó a <b>${escapeHtml(evt.victim || 'Desconocido')}</b></div>`;
      }
      return `<div>⚔️ Evento: ${escapeHtml(evt.type || 'combate')}</div>`;
    }).join('');
  } catch (error) {
    console.warn('Error al cargar feed de combate:', error);
  }
}

async function sendCommand(username, text) {
  const name = String(username || '').trim();
  const message = String(text || '').trim();
  if (!/^[A-Za-z0-9_.-]{3,24}$/.test(name)) {
    return showStatus('Escribe un usuario válido (3–24 caracteres alfanuméricos, . - _).', true);
  }
  if (!message) return;
  try {
    const command = message.toUpperCase();
    if (/^[KMV]$/.test(command)) {
      const profile = await window.kiArenaCloud.get(name);
      if (!profile) return showStatus(`@${name} debe ingresar con E antes de usar poderes.`, true);
      const restriction = powerBlockReason(profile.race, profile.level, command);
      if (restriction) return showStatus(restriction, true);
    }
    await window.kiArenaCloud.addMessage(name, message);
    if ($('#chat-user')) $('#chat-user').value = name;
    if ($('#chat-message')) $('#chat-message').value = '';
    showStatus(message.toUpperCase() === 'E' ? `Comando E (Entrar) enviado para @${name}.` : `Comando "${message}" enviado por @${name}.`);
    await refreshChat();
    await loadRoster();
  } catch (error) {
    showStatus(`No se pudo enviar: ${error.message}`, true);
  }
}

export async function startBot() {
  wireEnvironment();

  try {
    gameplaySettings = normalizeGameSettings(await window.kiArenaCloud.getSettings() || DEFAULT_GAME_SETTINGS);
  } catch (_) {
    gameplaySettings = normalizeGameSettings(DEFAULT_GAME_SETTINGS);
  }

  const sendBtn = $('#send-chat');
  const messageInput = $('#chat-message');
  const userInput = $('#chat-user');
  const joinBtn = $('#join-user');
  const joinAllBtn = $('#join-all');

  if (sendBtn && messageInput && userInput) {
    sendBtn.addEventListener('click', () => sendCommand(userInput.value, messageInput.value));
    messageInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') sendCommand(userInput.value, messageInput.value);
    });
  }

  if (joinBtn && userInput) {
    joinBtn.addEventListener('click', () => sendCommand(userInput.value, 'E'));
  }

  document.querySelectorAll('[data-sim-command]').forEach(button => {
    button.addEventListener('click', () => {
      if (userInput) sendCommand(userInput.value, button.dataset.simCommand);
    });
  });

  if (joinAllBtn) {
    joinAllBtn.addEventListener('click', async () => {
      const pending = cachedPlayers.filter(p => p.alive === false);
      if (!pending.length) {
        showStatus('No hay luchadores pendientes ni eliminados.');
        return;
      }
      showStatus(`Ingresando ${pending.length} luchadores a la arena…`);
      for (const p of pending) {
        await sendCommand(p.username, 'E');
      }
      showStatus(`Se enviaron solicitudes de ingreso para ${pending.length} luchadores.`);
    });
  }

  try {
    await Promise.all([loadRoster(), refreshChat(), refreshCombatFeed()]);
    showStatus(`Conectado con Firestore · ${window.KI_ARENA_FIREBASE.environment.toUpperCase()} · chat, roster y métricas listos.`);
  } catch (error) {
    showStatus(`Firebase no disponible: ${error.message}`, true);
  }

  setInterval(() => loadRoster().catch(e => console.warn('Roster sync error:', e)), 4000);
  setInterval(() => refreshChat().catch(e => console.warn('Chat sync error:', e)), 2500);
  setInterval(() => refreshCombatFeed().catch(e => console.warn('Feed sync error:', e)), 4000);
}
