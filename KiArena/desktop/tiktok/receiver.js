// Receptor de TikTok Live (proceso principal de Electron). Se conecta al live
// público de un @usuario con tiktok-live-connector (sin login), normaliza chat,
// likes y regalos, deduplica por ID de mensaje y los entrega a quien escuche
// (el servidor local los manda a la arena por SSE).
//
// Evento normalizado:
// { type: 'chat'|'like'|'gift', eventId, userId, uniqueId, nickname,
//   text?, likeCount?, gift?: { giftId, giftName, coins, count }, simulated? }
const { EventEmitter } = require('node:events');

const RETRY_STEPS = [5, 10, 20, 40, 60];
const SEEN_LIMIT = 5000;

function cleanUniqueId(value) {
  return String(value || '').replace(/^@/, '').trim();
}

// tiktok-live-connector 2.5 entrega el usuario con `id` y `displayId` (el @) y el
// comentario en `content`; versiones anteriores usaban userId/uniqueId/comment.
function userOf(data) {
  const user = data?.user || {};
  const userId = String(user.userId || user.id || data?.userId || '').trim();
  const uniqueId = cleanUniqueId(user.uniqueId || user.displayId || user.username || data?.uniqueId);
  return { userId: userId || uniqueId, uniqueId, nickname: String(user.nickname || data?.nickname || uniqueId) };
}

function eventIdOf(type, data, user) {
  const msgId = data?.common?.msgId || data?.msgId;
  if (msgId) return String(msgId);
  // Sin msgId (no debería pasar): ID de mejor esfuerzo para no perder el evento.
  return `${type}_${user.userId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Funciones puras para poder probarlas sin conexión.
function normalizeChat(data) {
  const user = userOf(data);
  return { type: 'chat', eventId: eventIdOf('chat', data, user), ...user, text: String(data?.content ?? data?.comment ?? '').slice(0, 120) };
}

function normalizeLike(data) {
  const user = userOf(data);
  return { type: 'like', eventId: eventIdOf('like', data, user), ...user, likeCount: Math.max(1, Number(data?.likeCount ?? data?.count) || 1) };
}

// Devuelve null mientras una racha sigue abierta: solo cuenta el final.
function normalizeGift(data, giftList = []) {
  const details = { ...(data?.gift || {}), ...(data?.giftDetails || {}) };
  details.giftName = details.giftName || details.name;
  details.diamondCount = details.diamondCount ?? details.diamond_count;
  const giftId = Number(data?.giftId || details.id) || 0;
  const giftType = Number(details.giftType ?? details.type ?? data?.giftType);
  if (giftType === 1 && !data?.repeatEnd) return null;
  const known = giftList.find(g => Number(g.id) === giftId);
  const user = userOf(data);
  return {
    type: 'gift', eventId: eventIdOf('gift', data, user), ...user,
    gift: {
      giftId,
      giftName: String(details.giftName || data?.extendedGiftInfo?.name || known?.name || `Regalo ${giftId}`),
      coins: Number(details.diamondCount ?? data?.extendedGiftInfo?.diamond_count ?? known?.diamond_count) || 0,
      count: Math.max(1, Number(data?.repeatCount) || 1)
    }
  };
}

class TikTokReceiver extends EventEmitter {
  constructor({ signApiKey = '', log = console } = {}) {
    super();
    this.signApiKey = signApiKey;
    this.log = log;
    this.username = '';
    this.state = 'disconnected';
    this.detail = '';
    this.connection = null;
    this.retry = 0;
    this.retryTimer = null;
    this.gifts = [];
    this.seen = new Set();
  }

  status() {
    return { state: this.state, username: this.username, detail: this.detail, gifts: this.gifts.map(g => ({ giftId: Number(g.id), giftName: g.name, coins: Number(g.diamond_count) || 0 })) };
  }

  setState(state, detail = '') {
    this.state = state;
    this.detail = detail;
    this.emit('status', this.status());
  }

  // Entrega un evento normalizado una sola vez (también los simulados).
  deliver(event) {
    if (!event || !event.userId) return false;
    if (this.seen.has(event.eventId)) return false;
    this.seen.add(event.eventId);
    if (this.seen.size > SEEN_LIMIT) this.seen.delete(this.seen.values().next().value);
    this.emit('event', event);
    return true;
  }

  async connect(username) {
    this.disconnect(false);
    this.username = cleanUniqueId(username);
    if (!this.username) throw new Error('Escribe el @usuario del live.');
    await this.open();
  }

  async open() {
    clearTimeout(this.retryTimer);
    this.setState('connecting');
    let lib;
    try {
      lib = await import('tiktok-live-connector');
    } catch (error) {
      return this.setState('error', `No se pudo cargar tiktok-live-connector: ${error.message}`);
    }
    const { TikTokLiveConnection, WebcastEvent, ControlEvent } = lib;
    const connection = new TikTokLiveConnection(this.username, {
      ...(this.signApiKey ? { signApiKey: this.signApiKey } : {}),
      // La lista de regalos se pide aparte: si falla (p. ej. plan de Euler Stream),
      // no debe impedir la conexión al chat, likes y regalos.
      processInitialData: false,
      enableExtendedGiftInfo: false
    });
    this.connection = connection;
    connection.on(WebcastEvent.CHAT, data => this.deliver(normalizeChat(data)));
    connection.on(WebcastEvent.LIKE, data => this.deliver(normalizeLike(data)));
    connection.on(WebcastEvent.GIFT, data => this.deliver(normalizeGift(data, this.gifts)));
    connection.on(WebcastEvent.STREAM_END, () => {
      if (this.connection === connection) this.scheduleRetry('ended', 'El live terminó.');
    });
    connection.on(ControlEvent.DISCONNECTED, () => {
      if (this.connection === connection && this.state === 'connected') this.scheduleRetry('reconnecting', 'Se cortó la conexión.');
    });
    connection.on(ControlEvent.ERROR, ({ info, exception } = {}) => this.log.warn('[ki-arena] TikTok', info || '', exception?.message || ''));
    try {
      await connection.connect();
      if (this.connection !== connection) return;
      this.retry = 0;
      this.setState('connected');
      connection.fetchAvailableGifts().then(list => {
        if (this.connection !== connection) return;
        this.gifts = Array.isArray(list) ? list : Array.isArray(list?.gifts) ? list.gifts : [];
        this.setState('connected');
      }).catch(error => this.log.warn('[ki-arena] TikTok: no se pudo leer la lista de regalos:', error.message));
    } catch (error) {
      if (this.connection !== connection) return;
      // TikTok responde user_not_found cuando no hay un live abierto para esa cuenta
      // (o el @ está mal): se sigue reintentando, con un mensaje claro.
      const reasons = (error?.config?.requestErrs || []).map(e => String(e?.message || ''));
      if (reasons.some(r => r.includes('user_not_found'))) {
        return this.scheduleRetry('offline', `TikTok no encuentra un live abierto de @${this.username}: revisa que sea el @ de la cuenta que transmite y que el live ya esté en curso.`);
      }
      const offline = error?.constructor?.name === 'UserOfflineError';
      this.scheduleRetry(offline ? 'offline' : 'reconnecting', offline ? `@${this.username} no está en vivo.` : error.message);
    }
  }

  scheduleRetry(state, detail) {
    clearTimeout(this.retryTimer);
    const wait = RETRY_STEPS[Math.min(this.retry, RETRY_STEPS.length - 1)];
    this.retry += 1;
    this.setState(state, `${detail} Reintento en ${wait} s.`);
    this.retryTimer = setTimeout(() => this.open(), wait * 1000);
  }

  disconnect(announce = true) {
    clearTimeout(this.retryTimer);
    const connection = this.connection;
    this.connection = null;
    if (connection) {
      try { connection.disconnect(); } catch { /* ya cerrada */ }
    }
    if (announce) this.setState('disconnected');
  }
}

module.exports = { TikTokReceiver, normalizeChat, normalizeLike, normalizeGift, cleanUniqueId };
