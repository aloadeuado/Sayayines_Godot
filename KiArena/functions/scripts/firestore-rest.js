// Firestore por REST con la apiKey web pública, con la misma forma mínima que usa
// la migración del Admin SDK: db.doc(path).get()/set(data, {merge: true}) y
// db.collection(path).get(). Sirve para correr la migración sin credenciales de
// servicio, con las mismas reglas de seguridad que la app web.
// set con merge = PATCH con updateMask: solo cambia los campos enviados.
const ORIGIN = 'https://firestore.googleapis.com/v1';

export function createRestFirestore({ projectId, apiKey, databaseId = '(default)' }) {
  const root = `projects/${projectId}/databases/${databaseId}/documents`;
  const url = (path, query = '') => `${ORIGIN}/${root}/${path.split('/').map(encodeURIComponent).join('/')}?key=${encodeURIComponent(apiKey)}${query}`;

  async function request(target, options = {}) {
    for (let attempt = 0; ; attempt++) {
      const response = await fetch(target, { ...options, signal: AbortSignal.timeout(20000) }).catch(error => ({ ok: false, status: 0, text: async () => String(error) }));
      if (response.ok) return response.json();
      if (response.status === 404) return null;
      if (attempt < 4 && [0, 429, 500, 503].includes(response.status)) { await new Promise(r => setTimeout(r, 500 * 2 ** attempt)); continue; }
      throw new Error(`Firestore ${response.status}: ${(await response.text()).slice(0, 200)}`);
    }
  }

  const encode = value => {
    if (value === null || value === undefined) return { nullValue: null };
    if (value instanceof RestDoc) return { referenceValue: `${root}/${value.path}` };
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
    if ('referenceValue' in value) return new RestDoc(value.referenceValue.split('/documents/').slice(1).join('/documents/'));
    if ('stringValue' in value) return value.stringValue;
    if ('booleanValue' in value) return value.booleanValue;
    if ('integerValue' in value) return Number(value.integerValue);
    if ('doubleValue' in value) return value.doubleValue;
    if ('timestampValue' in value) return value.timestampValue;
    if ('arrayValue' in value) return (value.arrayValue.values || []).map(decode);
    if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([k, v]) => [k, decode(v)]));
    return null;
  };
  const snapshot = (ref, doc) => ({
    ref, id: ref.id, exists: Boolean(doc),
    data: () => (doc ? Object.fromEntries(Object.entries(doc.fields || {}).map(([k, v]) => [k, decode(v)])) : undefined)
  });

  class RestDoc {
    constructor(path) { this.path = path; this.id = path.split('/').pop(); }
    async get() { return snapshot(this, await request(url(this.path))); }
    async set(data, options = {}) {
      const fields = toFields(data);
      const mask = options.merge ? Object.keys(fields).map(k => `&updateMask.fieldPaths=${encodeURIComponent(/^[A-Za-z_][A-Za-z0-9_]*$/.test(k) ? k : `\`${k}\``)}`).join('') : '';
      await request(url(this.path, mask), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
    }
  }

  return {
    doc: path => new RestDoc(path),
    collection: path => ({
      async get() {
        const docs = [];
        let token = '';
        do {
          const page = await request(url(path, `&pageSize=300${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`));
          for (const doc of page?.documents || []) docs.push(snapshot(new RestDoc(doc.name.split('/documents/').slice(1).join('/documents/')), doc));
          token = page?.nextPageToken || '';
        } while (token);
        return { docs, empty: docs.length === 0 };
      }
    })
  };
}
