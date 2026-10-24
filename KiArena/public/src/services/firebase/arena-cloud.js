import { catalogDocument } from '../../config/game-catalog.js';

// Adaptador Firestore (REST) de la arena, el bot y settings.
// Reglas de datos: todo documento nuevo lleva id, reference (referencia completa,
// ligada al entorno) e isActive; nada se borra (isActive=false); las lecturas
// ignoran isActive === false y tratan el campo ausente como activo.
export class FsRef {
  constructor(path) { this.path = path; }
  get id() { return this.path.split('/').pop(); }
}

export function createArenaCloud(cfg){
  const root = `projects/${cfg.projectId}/databases/${cfg.databaseId}/documents`;
  const docs = `${cfg.firestoreOrigin || 'https://firestore.googleapis.com'}/v1/projects/${cfg.projectId}/databases/${encodeURIComponent(cfg.databaseId)}/documents`;
  const paths = cfg.collections || {
    players: cfg.collectionPath, messages: `${cfg.environmentPath}Messages`, events: `${cfg.environmentPath}Events`, settings: `environments/${cfg.environment}/kiArenaSettings`
  };
  const envPrefix = `environments/${cfg.environment}/`;
  const status = document.querySelector('#firebase-status');
  const setStatus = (text, ok = false) => { if (status) { status.textContent = text; status.dataset.ok = ok ? 'true' : 'false'; } };
  const normalize = s => String(s || '').trim().toLowerCase();
  const ref = (kind, id) => new FsRef(`${paths[kind]}/${id}`);
  const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

  // ---------- Conversión de valores ----------
  const encode = v => {
    if (v === null || v === undefined) return { nullValue: null };
    if (v instanceof FsRef) {
      if (!v.path.startsWith(envPrefix)) throw new Error(`Referencia de otro entorno: ${v.path}`);
      return { referenceValue: `${root}/${v.path}` };
    }
    if (typeof v === 'string') return { stringValue: v };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (typeof v === 'number') return { doubleValue: v };
    if (Array.isArray(v)) return { arrayValue: { values: v.map(encode) } };
    if (typeof v === 'object') return { mapValue: { fields: toFields(v) } };
    return { stringValue: String(v) };
  };
  const toFields = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined).map(([k, v]) => [k, encode(v)]));
  const decode = v => {
    if (!v || 'nullValue' in v) return null;
    if ('referenceValue' in v) {
      const path = v.referenceValue.split('/documents/').slice(1).join('/documents/');
      // Una referencia de otro entorno es un error de datos: no se usa.
      if (!path.startsWith(envPrefix)) { console.warn('Referencia de otro entorno ignorada:', path); return null; }
      return new FsRef(path);
    }
    if ('stringValue' in v) return v.stringValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return v.doubleValue;
    if ('timestampValue' in v) return v.timestampValue;
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(decode);
    if ('mapValue' in v) return fromFields(v.mapValue.fields);
    return null;
  };
  const fromFields = o => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k, decode(v)]));
  const fromDoc = doc => {
    const data = fromFields(doc.fields);
    return { ...data, id: data.id || doc.name.split('/').pop() };
  };
  const active = item => item && item.isActive !== false;

  async function request(url, options = {}) {
    const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}key=${encodeURIComponent(cfg.apiKey)}`, { ...options, signal: AbortSignal.timeout(10000) });
    if (!response.ok) { const message = await response.text(); throw new Error(`Firestore ${response.status}: ${message.slice(0, 180)}`); }
    return response.status === 204 ? null : response.json();
  }
  async function getDoc(path) {
    try { return fromDoc(await request(`${docs}/${path}`)); }
    catch (e) { if (String(e.message).includes('Firestore 404')) return null; throw e; }
  }
  // PATCH con updateMask: solo cambia los campos enviados (no pisa isActive ni otros).
  async function patch(path, data) {
    const fields = toFields(data);
    const mask = Object.keys(fields).map(k => `updateMask.fieldPaths=${encodeURIComponent(k.includes('.') ? `\`${k}\`` : k)}`).join('&');
    return request(`${docs}/${path}?${mask}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
  }
  async function listAll(path) {
    let token = '', items = [];
    do {
      const page = await request(`${docs}/${path}?pageSize=1000${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`);
      for (const doc of page.documents || []) items.push(fromDoc(doc));
      token = page.nextPageToken || '';
    } while (token);
    return items;
  }
  // Campos base de un documento nuevo; en uno existente, completa los que falten sin tocar isActive.
  function baseFields(kind, id, existing, now) {
    return {
      ...(existing?.id ? {} : { id }),
      ...(existing?.reference ? {} : { reference: ref(kind, id) }),
      ...(existing ? {} : { isActive: true, createdAt: now })
    };
  }

  // ---------- Jugadores (kiArenaPlayers) ----------
  // get: null si no existe; los desactivados se devuelven marcados para que la
  // arena responda «perfil desactivado» en lugar de crear otro (HU-ENT-06).
  async function get(username) {
    const key = normalize(username);
    const doc = await getDoc(`${paths.players}/${encodeURIComponent(key)}`);
    return doc ? { ...doc, id: doc.id || key } : null;
  }
  async function save(username, progress, existing = undefined) {
    const key = normalize(username), now = new Date().toISOString();
    const current = existing === undefined ? await get(key) : existing;
    const record = {
      ...baseFields('players', key, current, now),
      username: String(username).trim(),
      usernameKey: key,
      name: String(username).trim(),
      nameKey: key,
      race: Number(progress.race) || 0,
      ...(progress.playerTypeCode ? { playerTypeRef: ref('playerTypes', progress.playerTypeCode) } : {}),
      ...(progress.userRef instanceof FsRef ? { userRef: progress.userRef } : {}),
      level: Math.max(1, Math.min(100, Number(progress.level) || 1)),
      xp: Math.max(0, Number(progress.xp) || 0),
      kills: Math.max(0, Number(progress.kills) || 0),
      deaths: Math.max(0, Number(progress.deaths) || 0),
      alive: progress.alive !== false,
      hp: Math.max(0, Number(progress.hp) || 0),
      maxHp: Math.max(1, Number(progress.maxHp) || 100),
      hpFormulaVersion: Math.max(1, Number(progress.hpFormulaVersion) || 1),
      ...(progress.utilityState ? { utilityState: progress.utilityState } : {}),
      schemaVersion: 3,
      updatedAt: now
    };
    return patch(`${paths.players}/${encodeURIComponent(key)}`, record);
  }
  async function listPlayers() { return (await listAll(paths.players)).filter(active); }

  // ---------- Catálogos ----------
  async function listCatalog() {
    const [races, playerTypes, powers] = await Promise.all([listAll(paths.races), listAll(paths.playerTypes), listAll(paths.powers)]);
    return { races, playerTypes, powers };
  }
  // Guarda campos de un documento de catálogo (races, playerTypes, powers).
  // full: el elemento completo del catálogo; si el documento aún no existe se guarda entero.
  async function saveCatalogDoc(kind, id, data, full = null) {
    const existing = await getDoc(`${paths[kind]}/${encodeURIComponent(id)}`);
    const now = new Date().toISOString();
    const seed = !existing && full ? catalogDocument(kind, full, ref) : {};
    return patch(`${paths[kind]}/${encodeURIComponent(id)}`, { ...seed, ...baseFields(kind, id, existing, now), ...data, updatedAt: now });
  }

  // ---------- Poderes por personaje (kiArenaPlayerPowers) ----------
  async function listPlayerPowers() { return listAll(paths.playerPowers); }
  async function savePlayerPower(playerId, powerId, data, existing) {
    const id = `${playerId}:${powerId}`, now = new Date().toISOString();
    return patch(`${paths.playerPowers}/${encodeURIComponent(id)}`, {
      ...baseFields('playerPowers', id, existing, now),
      ...(existing ? {} : { playerRef: ref('players', playerId), powerRef: ref('powers', powerId), unlockedAt: now }),
      ...data,
      updatedAt: now
    });
  }

  // ---------- Ajustes ----------
  async function getSettings() {
    const doc = await getDoc(`${paths.settings}/gameplay`);
    if (!doc || doc.isActive === false) return null;
    return doc.settingsJson ? JSON.parse(doc.settingsJson) : null;
  }
  async function saveSettings(settings) {
    const existing = await getDoc(`${paths.settings}/gameplay`), now = new Date().toISOString();
    return patch(`${paths.settings}/gameplay`, { ...baseFields('settings', 'gameplay', existing, now), settingsJson: JSON.stringify(settings), environment: cfg.environment, updatedAt: now });
  }

  // ---------- Mensajes y eventos ----------
  async function addRecord(kind, value) {
    const id = newId(), now = new Date().toISOString();
    await patch(`${paths[kind]}/${id}`, { id, reference: ref(kind, id), isActive: true, ...value, createdAt: now });
    return id;
  }
  async function addMessage(username, text) {
    const key = normalize(username);
    return addRecord('messages', {
      username: String(username || 'Sistema'),
      ...(key && key !== 'sistema' ? { playerRef: ref('players', key) } : {}),
      text: String(text || '').slice(0, 120),
      command: /^[A-Z]$/i.test(String(text || '').trim()) ? String(text).trim().toUpperCase() : ''
    });
  }
  // value puede traer killerKey/victimKey (usernameKey) y powerId: se guardan como referencias.
  async function addEvent(type, value = {}) {
    const { killerKey, victimKey, powerId, ...rest } = value;
    return addRecord('events', {
      type, ...rest,
      ...(killerKey ? { killerRef: ref('players', normalize(killerKey)) } : {}),
      ...(victimKey ? { victimRef: ref('players', normalize(victimKey)) } : {}),
      ...(powerId ? { powerRef: ref('powers', powerId) } : {})
    });
  }
  async function listMessages() {
    const page = await request(`${docs}/${paths.messages}?pageSize=50&orderBy=createdAt%20desc`);
    return (page.documents || []).reverse().map(fromDoc).filter(active);
  }
  async function listEvents() {
    try {
      const page = await request(`${docs}/${paths.events}?pageSize=30&orderBy=createdAt%20desc`);
      return (page.documents || []).reverse().map(fromDoc).filter(active);
    } catch (e) { console.warn('No se pudieron leer los eventos:', e); return []; }
  }
  async function health() {
    try { await request(`${docs}/${paths.races}?pageSize=1`); setStatus(`Guardado en Firebase · ${cfg.environment.toUpperCase()} · ${cfg.projectId}`, true); }
    catch (e) { setStatus('Firebase sin conexión: ' + e.message); console.warn(e); }
  }

  const api = { get, save, listPlayers, listCatalog, saveCatalogDoc, listPlayerPowers, savePlayerPower, getSettings, saveSettings, addMessage, addEvent, listMessages, listEvents, health, setStatus, ref, FsRef };
  health();
  return api;
}
