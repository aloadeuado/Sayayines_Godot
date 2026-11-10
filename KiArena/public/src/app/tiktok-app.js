// Panel TikTok Live (/tiktok): conectar la app de escritorio a un live, ver su
// estado y la lista de regalos, y simular eventos. Solo funciona en el escritorio.
import { normalizeGameSettings, DEFAULT_GAME_SETTINGS } from '../config/gameplay-settings.js';
import { tiktokAvailable, listenTikTok, connectTikTok, disconnectTikTok, simulateTikTok } from '../services/tiktok/live-client.js';

const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const STATE_LABELS = {
  disconnected: 'Sin conexión.',
  connecting: 'Conectando…',
  connected: 'Conectado',
  reconnecting: 'Reconectando',
  offline: 'El usuario no está en vivo',
  ended: 'El live terminó',
  error: 'Error'
};

function showStatus(st) {
  const label = STATE_LABELS[st.state] || st.state;
  const box = $('#tiktok-status');
  box.textContent = st.state === 'connected' ? `${label} a @${st.username}.` : `${label}${st.username && st.state !== 'disconnected' ? ` (@${st.username})` : ''}. ${st.detail || ''}`.trim();
  box.dataset.state = st.state === 'connected' ? 'ok' : ['error', 'offline'].includes(st.state) ? 'error' : '';
  if (st.username && !$('#tiktok-username').value) $('#tiktok-username').value = `@${st.username}`;
  const gifts = (st.gifts || []).slice().sort((a, b) => a.coins - b.coins);
  $('#tiktok-gifts').hidden = !gifts.length;
  $('#tiktok-gift-list').innerHTML = gifts.length
    ? `<table><thead><tr><th>Regalo</th><th>ID</th><th>Monedas</th></tr></thead><tbody>${gifts.map(g => `<tr><td>${escape(g.giftName)}</td><td>${escape(g.giftId)}</td><td>${escape(g.coins)}</td></tr>`).join('')}</tbody></table>`
    : '';
}

function simUser() {
  return { userId: $('#sim-user-id').value.trim() || '900001', uniqueId: $('#sim-user').value.trim().replace(/^@/, '') || 'tiktoker_prueba', nickname: $('#sim-user').value.trim() };
}

async function simulate(event, label) {
  const box = $('#sim-status');
  try {
    await simulateTikTok({ ...simUser(), ...event });
    box.textContent = `Simulado: ${label}.`;
    box.dataset.state = 'ok';
  } catch (error) {
    box.textContent = `No se pudo simular: ${error.message}`;
    box.dataset.state = 'error';
  }
}

export async function startTikTokPanel() {
  if (!(await tiktokAvailable())) {
    $('#tiktok-desktop-only').hidden = false;
    $('#firebase-status').textContent = 'Fuera de la app de escritorio.';
    return;
  }
  for (const id of ['#tiktok-panel', '#tiktok-sim']) $(id).hidden = false;
  let settings = normalizeGameSettings(DEFAULT_GAME_SETTINGS);
  try {
    settings = normalizeGameSettings(await window.kiArenaCloud.getSettings() || DEFAULT_GAME_SETTINGS);
    $('#firebase-status').textContent = `Regalos de ${window.KI_ARENA_FIREBASE.environment.toUpperCase()} cargados desde Settings.`;
  } catch (error) {
    $('#firebase-status').textContent = `Settings no disponibles (${error.message}); se usan los regalos por defecto.`;
  }
  $('#sim-gift').innerHTML = settings.tiktok.gifts.map((g, i) => `<option value="${i}">${escape(g.giftName)} · ${escape(g.coins)} monedas → ${escape(g.powerCode)}</option>`).join('')
    + '<option value="unmapped">Regalo sin mapa (solo agradece)</option>';

  await listenTikTok({ onStatus: showStatus });
  $('#tiktok-connect-form').addEventListener('submit', async event => {
    event.preventDefault();
    try {
      showStatus(await connectTikTok($('#tiktok-username').value));
    } catch (error) {
      showStatus({ state: 'error', detail: error.message });
    }
  });
  $('#tiktok-disconnect').addEventListener('click', async () => showStatus(await disconnectTikTok()));

  $('#sim-send-comment').addEventListener('click', () => simulate({ type: 'chat', text: $('#sim-comment').value }, `comentario «${$('#sim-comment').value}»`));
  $('#sim-send-likes').addEventListener('click', () => simulate({ type: 'like', likeCount: Number($('#sim-likes').value) || 1 }, `${$('#sim-likes').value} likes`));
  $('#sim-send-gift').addEventListener('click', () => {
    const choice = $('#sim-gift').value;
    const g = choice === 'unmapped' ? { giftId: 1, giftName: 'Regalo sin mapa', coins: 1 } : settings.tiktok.gifts[Number(choice)];
    const count = Math.max(1, Number($('#sim-gift-count').value) || 1);
    simulate({ type: 'gift', gift: { giftId: g.giftId, giftName: g.giftName, coins: g.coins, count } }, `${g.giftName} ×${count}`);
  });
}
