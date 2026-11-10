// Traduce un evento normalizado de TikTok Live (desktop/tiktok/receiver.js) a una
// acción de juego. Puro: sin DOM, red ni Firestore, para probarlo con Node.
//
// Acciones:
// { action: 'join',    key, name, event }
// { action: 'command', key, name, command, event }      letra de poder (K, M, V, B)
// { action: 'chat',    key, name, text, event }         comentario sin comando
// { action: 'heal',    key, name, amount, event }       likes
// { action: 'gift',    key, name, powerCode, count, gift, event }   powerCode '' = regalo sin mapa

// ID del jugador de TikTok: tiktok_{userId} (reglas-datos.md).
export function tiktokPlayerKey(userId) {
  const clean = String(userId || '').trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  return clean ? `tiktok_${clean}` : '';
}

// Nombre visible: el @usuario limpio a [A-Za-z0-9_.-]{3,24}.
export function tiktokDisplayName(event) {
  let name = String(event?.uniqueId || event?.nickname || '').replace(/^@/, '').replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 24);
  if (name.length < 3) name = `tt_${String(event?.userId || '').replace(/[^0-9A-Za-z]/g, '')}`.slice(0, 24);
  return name.length >= 3 ? name : 'tiktoker';
}

// Regalo configurado: por giftId si el mapa lo tiene, si no por nombre (sin mayúsculas).
export function findGiftMapping(gifts, gift) {
  const id = Number(gift?.giftId) || 0;
  const name = String(gift?.giftName || '').trim().toLowerCase();
  const active = (gifts || []).filter(g => g.isActive !== false);
  return active.find(g => g.giftId && g.giftId === id)
    || active.find(g => !g.giftId && g.giftName && g.giftName.trim().toLowerCase() === name)
    || null;
}

export function mapTikTokEvent(event, settings, powerCommands = ['K', 'M', 'V', 'B']) {
  const key = tiktokPlayerKey(event?.userId);
  if (!key) return null;
  const name = tiktokDisplayName(event);
  const base = { key, name, event };
  const tiktok = settings?.tiktok || {};
  if (event.type === 'chat') {
    const text = String(event.text || '').trim();
    // Tolera comillas, signos y emojis alrededor de la letra («"e"», «e!», «E 🔥»).
    const letters = text.replace(/[^A-Za-z]/g, '');
    const cmd = text.length <= 8 ? letters.toUpperCase() : text.replace(/\s+/g, '').toUpperCase();
    if (cmd === 'E') return { action: 'join', ...base };
    if (cmd.length === 1 && powerCommands.includes(cmd)) return { action: 'command', command: cmd, ...base };
    return text ? { action: 'chat', text: text.slice(0, 120), ...base } : null;
  }
  if (event.type === 'like') {
    const amount = Math.max(1, Number(event.likeCount) || 1) * (Number.isFinite(Number(tiktok.likeHealHp)) ? Number(tiktok.likeHealHp) : 1);
    return amount > 0 ? { action: 'heal', amount, ...base } : null;
  }
  if (event.type === 'gift') {
    const mapping = findGiftMapping(tiktok.gifts, event.gift);
    const max = Math.max(1, Number(tiktok.maxQueuedPerUser) || 5);
    return { action: 'gift', powerCode: mapping?.powerCode || '', count: Math.min(max, Math.max(1, Number(event.gift?.count) || 1)), gift: event.gift || {}, ...base };
  }
  return null;
}
