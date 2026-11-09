// Backend por REST para correr authApi SIN Cloud Functions (modo local).
// Sirve cuando la función no está desplegada (plan Spark): la app de escritorio
// y el servidor web local corren el mismo createAuthApi con estos adaptadores.
//
// - Firestore: misma forma mínima que usa accounts.js del Admin SDK
//   (doc/collection/where/limit/get/set con merge/runTransaction), sobre la API
//   REST con la apiKey web pública. Las transacciones son reales
//   (beginTransaction + commit), así que la regla «una cuenta externa no puede
//   estar activa en dos usuarios» se sigue cumpliendo.
// - Auth: verifica el ID token con identitytoolkit accounts:lookup (si el token
//   es falso o de otro proyecto, Google lo rechaza). No puede firmar custom
//   tokens: entrar con Twitch, Kick o TikTok sigue necesitando la función.
import { randomBytes } from 'node:crypto';

const SIMPLE_FIELD = /^[A-Za-z_][A-Za-z0-9_]*$/;
const quoteField = key => (SIMPLE_FIELD.test(key) ? key : `\`${String(key).replace(/[`\\]/g, c => `\\${c}`)}\``);
const autoId = () => randomBytes(15).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 20).padEnd(20, '0');

export function createRestAdminFirestore({
  projectId, apiKey, databaseId = '(default)', origin = 'https://firestore.googleapis.com', fetchImpl = globalThis.fetch
}) {
  const root = `projects/${projectId}/databases/${databaseId}/documents`;
  const base = `${origin}/v1/${root}`;
  const withKey = url => (apiKey ? `${url}${url.includes('?') ? '&' : '?'}key=${encodeURIComponent(apiKey)}` : url);
  const docUrl = path => `${base}/${path.split('/').map(encodeURIComponent).join('/')}`;

  async function request(url, options = {}) {
    for (let attempt = 0; ; attempt++) {
      const response = await fetchImpl(withKey(url), {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        signal: AbortSignal.timeout(20000)
      }).catch(error => ({ ok: false, status: 0, text: async () => String(error) }));
      if (response.ok) return response.json();
      if (response.status === 404 && options.allow404) return null;
      if (attempt < 3 && [0, 429, 503].includes(response.status) && !options.noRetry) {
        await new Promise(r => setTimeout(r, 400 * 2 ** attempt));
        continue;
      }
      const error = new Error(`Firestore ${response.status}: ${(await response.text()).slice(0, 300)}`);
      error.status = response.status === 0 ? 503 : 500;
      throw error;
    }
  }

  // ---------- Valores ----------
  const encode = value => {
    if (value === null || value === undefined) return { nullValue: null };
    if (value instanceof DocRef) return { referenceValue: `${root}/${value.path}` };
    if (value instanceof Date) return { timestampValue: value.toISOString() };
    if (typeof value === 'string') return { stringValue: value };
    if (typeof value === 'boolean') return { booleanValue: value };
    if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
    if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
    if (typeof value === 'object') return { mapValue: { fields: toFields(value) } };
    return { stringValue: String(value) };
  };
  const toFields = object => Object.fromEntries(Object.entries(object).filter(([, v]) => v !== undefined).map(([k, v]) => [k, encode(v)]));
  const decode = value => {
    if (!value || 'nullValue' in value) return null;
    if ('referenceValue' in value) return new DocRef(value.referenceValue.split('/documents/').slice(1).join('/documents/'));
    if ('stringValue' in value) return value.stringValue;
    if ('booleanValue' in value) return value.booleanValue;
    if ('integerValue' in value) return Number(value.integerValue);
    if ('doubleValue' in value) return value.doubleValue;
    if ('timestampValue' in value) return value.timestampValue;
    if ('arrayValue' in value) return (value.arrayValue.values || []).map(decode);
    if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([k, v]) => [k, decode(v)]));
    return null;
  };
  // set(..., {merge: true}) del Admin SDK mezcla mapas anidados: la máscara
  // lleva cada hoja, no solo el campo de arriba.
  const leafPaths = (object, prefix = []) => Object.entries(object).filter(([, v]) => v !== undefined).flatMap(([k, v]) => {
    const path = [...prefix, k];
    const plain = v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof DocRef) && !(v instanceof Date) && Object.keys(v).length;
    return plain ? leafPaths(v, path) : [path.map(quoteField).join('.')];
  });
  const pathOf = name => name.split('/documents/').slice(1).join('/documents/');
  const snapshot = (ref, doc) => ({
    ref, id: ref.id, exists: Boolean(doc),
    data: () => (doc ? Object.fromEntries(Object.entries(doc.fields || {}).map(([k, v]) => [k, decode(v)])) : undefined)
  });

  async function getDoc(ref, transaction) {
    if (!transaction) return snapshot(ref, await request(docUrl(ref.path), { allow404: true }));
    // Dentro de una transacción se lee con batchGet (GET ?transaction= se cuelga en el emulador).
    const rows = await request(`${base}:batchGet`, { method: 'POST', body: JSON.stringify({ documents: [`${root}/${ref.path}`], transaction }), noRetry: true });
    return snapshot(ref, (rows || []).find(row => row.found)?.found || null);
  }

  async function runQuery(query, transaction) {
    const slash = query.path.lastIndexOf('/');
    const parentPath = slash > 0 ? query.path.slice(0, slash) : '';
    const collectionId = query.path.slice(slash + 1);
    const filters = query.filters.map(([field, value]) => ({ fieldFilter: { field: { fieldPath: quoteField(field) }, op: 'EQUAL', value: encode(value) } }));
    const structuredQuery = { from: [{ collectionId }] };
    if (filters.length === 1) structuredQuery.where = filters[0];
    if (filters.length > 1) structuredQuery.where = { compositeFilter: { op: 'AND', filters } };
    if (Number.isFinite(query.max)) structuredQuery.limit = query.max;
    const rows = await request(`${parentPath ? docUrl(parentPath) : base}:runQuery`, {
      method: 'POST', body: JSON.stringify({ structuredQuery, ...(transaction ? { transaction } : {}) }), noRetry: Boolean(transaction)
    });
    const docs = (rows || []).filter(row => row.document).map(row => snapshot(new DocRef(pathOf(row.document.name)), row.document));
    return { docs, empty: docs.length === 0, size: docs.length };
  }

  async function listCollection(path) {
    const docs = [];
    let token = '';
    do {
      const page = await request(`${docUrl(path)}?pageSize=300${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`, { allow404: true });
      for (const doc of page?.documents || []) docs.push(snapshot(new DocRef(pathOf(doc.name)), doc));
      token = page?.nextPageToken || '';
    } while (token);
    return { docs, empty: docs.length === 0, size: docs.length };
  }

  const writeOf = (ref, data, options = {}) => {
    const fields = toFields(data);
    const write = { update: { name: `${root}/${ref.path}`, fields } };
    if (options.merge) write.updateMask = { fieldPaths: leafPaths(data) };
    return write;
  };

  async function commit(writes, transaction) {
    if (!writes.length && !transaction) return;
    await request(`${base}:commit`, { method: 'POST', body: JSON.stringify({ writes, ...(transaction ? { transaction } : {}) }), noRetry: Boolean(transaction) });
  }

  class DocRef {
    constructor(path) {
      this.path = path;
      this.id = path.split('/').pop();
    }
    get parent() { return new CollectionRef(this.path.slice(0, this.path.lastIndexOf('/'))); }
    get() { return getDoc(this); }
    set(data, options = {}) { return commit([writeOf(this, data, options)]); }
    isEqual(other) { return other?.path === this.path; }
  }

  class Query {
    constructor(path, filters = [], max = Infinity) {
      this.path = path;
      this.filters = filters;
      this.max = max;
    }
    where(field, op, value) {
      if (op !== '==') throw new Error('El backend REST solo soporta ==.');
      return new Query(this.path, [...this.filters, [field, value]], this.max);
    }
    limit(n) { return new Query(this.path, this.filters, n); }
    get() { return this.filters.length || Number.isFinite(this.max) ? runQuery(this) : listCollection(this.path); }
  }

  class CollectionRef extends Query {
    doc(id) { return new DocRef(`${this.path}/${id || autoId()}`); }
  }

  async function runTransaction(fn) {
    for (let attempt = 0; ; attempt++) {
      const begun = await request(`${base}:beginTransaction`, { method: 'POST', body: JSON.stringify({}) });
      const transaction = begun.transaction;
      const writes = [];
      const tx = {
        get: target => (target instanceof DocRef ? getDoc(target, transaction) : runQuery(target, transaction)),
        set: (ref, data, options) => { writes.push(writeOf(ref, data, options)); return tx; }
      };
      let result;
      try {
        result = await fn(tx);
      } catch (error) {
        await request(`${base}:rollback`, { method: 'POST', body: JSON.stringify({ transaction }), noRetry: true }).catch(() => {});
        throw error;
      }
      try {
        await commit(writes, transaction);
        return result;
      } catch (error) {
        // Choque con otra escritura (ABORTED → 409): se reintenta como el SDK.
        if (attempt < 4 && /Firestore (409|400|503)/.test(error.message)) continue;
        throw error;
      }
    }
  }

  return {
    root,
    doc: path => new DocRef(path),
    collection: path => new CollectionRef(path),
    runTransaction
  };
}

function decodeJwtPayload(token) {
  const part = String(token).split('.')[1] || '';
  return JSON.parse(Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
}

export function createRestAuth({ projectId, apiKey, origin = 'https://identitytoolkit.googleapis.com', fetchImpl = globalThis.fetch, now = () => Date.now() }) {
  const sessions = new Map(); // uid -> { token, record }

  async function call(method, body) {
    const response = await fetchImpl(`${origin}/v1/accounts:${method}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error?.message || `identitytoolkit ${response.status}`);
    return payload;
  }

  const toRecord = user => ({
    uid: user.localId,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoUrl,
    emailVerified: user.emailVerified === true,
    disabled: user.disabled === true,
    providerData: (user.providerUserInfo || []).map(p => ({
      providerId: p.providerId, uid: p.rawId || p.federatedId, email: p.email, displayName: p.displayName, photoURL: p.photoUrl
    }))
  });

  return {
    mode: 'rest',
    async verifyIdToken(token) {
      const payload = decodeJwtPayload(token);
      if (payload.aud !== projectId) throw new Error('El token es de otro proyecto.');
      if (Number(payload.exp) * 1000 < now()) throw new Error('El token expiró.');
      // accounts:lookup valida firma y vigencia del token en Google.
      const { users } = await call('lookup', { idToken: token });
      const user = users?.[0];
      const uid = payload.user_id || payload.sub;
      if (!user || user.localId !== uid) throw new Error('Token inválido.');
      if (user.disabled) throw new Error('Usuario deshabilitado.');
      sessions.set(uid, { token, record: toRecord(user) });
      return { ...payload, uid };
    },
    async getUser(uid) {
      const session = sessions.get(uid);
      if (!session) throw new Error('Sin sesión verificada para ese usuario.');
      return session.record;
    },
    async updateUser(uid, change) {
      const session = sessions.get(uid);
      if (!session) throw new Error('Sin sesión verificada para ese usuario.');
      if (change.providersToUnlink?.length) await call('update', { idToken: session.token, deleteProvider: change.providersToUnlink });
    },
    async createCustomToken() {
      const error = new Error('Entrar con Twitch, Kick o TikTok necesita la Cloud Function authApi desplegada.');
      error.code = 'needs_cloud_function';
      error.status = 501;
      throw error;
    }
  };
}
