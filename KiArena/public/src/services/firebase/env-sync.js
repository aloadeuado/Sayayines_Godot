// Sincronizar tablas de catálogo entre ambientes (dev → qa → prd).
// Lo usan /settings (sección «Sincronizar ambientes») y el script
// functions/scripts/sync-environments.js. Trabaja con los documentos crudos de
// la API REST de Firestore para no perder tipos.
//
// Reglas:
// - Solo las colecciones de SYNC_COLLECTIONS (catálogos). Nunca datos de
//   usuarios, jugadores, mensajes ni eventos.
// - Las referencias se reescriben al ambiente destino:
//   environments/dev/... → environments/qa/...
// - No se borra nada. Un documento que solo existe en destino se deja igual.
//   El borrado suave viaja como un campo más (isActive=false).
// - Solo se escriben los campos del origen (PATCH con updateMask): los campos
//   que solo tiene el destino se conservan. Los campos de excludeFields son
//   propios de cada ambiente y nunca se copian (p. ej. clientId).
// - Escribir en prd exige confirmPrd = true.
export const SYNC_ENVIRONMENTS = Object.freeze(['dev', 'qa', 'prd']);

export const SYNC_COLLECTIONS = Object.freeze([
  { key: 'roles', collection: 'kiArenaRoles', label: 'Roles', excludeFields: [] },
  { key: 'races', collection: 'kiArenaRaces', label: 'Razas', excludeFields: [] },
  { key: 'playerTypes', collection: 'kiArenaPlayerTypes', label: 'Tipos de personaje', excludeFields: [] },
  { key: 'powers', collection: 'kiArenaPowers', label: 'Poderes', excludeFields: [] },
  { key: 'providerTypes', collection: 'kiArenaProviderTypes', label: 'Tipos de proveedor (sin clientId ni redirectUri)', excludeFields: ['clientId', 'redirectUri'] }
]);

// Campos de auditoría que agrega la sincronización; no cuentan como diferencia.
const AUDIT_FIELDS = ['syncedFrom', 'syncedAt', 'updatedAt', 'createdAt'];

export function syncCollection(key) {
  const item = SYNC_COLLECTIONS.find(c => c.key === key);
  if (!item) throw new Error(`La colección "${key}" no se puede sincronizar.`);
  return item;
}

export function assertSyncPair(from, to, { confirmPrd = false, apply = false } = {}) {
  if (!SYNC_ENVIRONMENTS.includes(from) || !SYNC_ENVIRONMENTS.includes(to)) throw new Error('Usa dev, qa o prd como origen y destino.');
  if (from === to) throw new Error('El origen y el destino deben ser distintos.');
  if (apply && to === 'prd' && !confirmPrd) throw new Error('Escribir en prd exige confirmación explícita.');
}

// Reescribe las referencias de un valor REST al ambiente destino.
export function rewriteValue(value, from, to) {
  if (!value || typeof value !== 'object') return value;
  if ('referenceValue' in value) {
    return { referenceValue: value.referenceValue.replace(`/documents/environments/${from}/`, `/documents/environments/${to}/`) };
  }
  if ('arrayValue' in value) return { arrayValue: { values: (value.arrayValue.values || []).map(v => rewriteValue(v, from, to)) } };
  if ('mapValue' in value) return { mapValue: { fields: rewriteFields(value.mapValue.fields || {}, from, to) } };
  return value;
}

export function rewriteFields(fields, from, to, exclude = []) {
  return Object.fromEntries(Object.entries(fields || {}).filter(([k]) => !exclude.includes(k)).map(([k, v]) => [k, rewriteValue(v, from, to)]));
}

// Forma canónica para comparar (enteros y decimales iguales, mapas ordenados).
function canonical(value) {
  if (!value || typeof value !== 'object') return value ?? null;
  if ('integerValue' in value) return { n: Number(value.integerValue) };
  if ('doubleValue' in value) return { n: Number(value.doubleValue) };
  if ('arrayValue' in value) return { a: (value.arrayValue.values || []).map(canonical) };
  if ('mapValue' in value) return { m: canonicalFields(value.mapValue.fields || {}) };
  return value;
}
function canonicalFields(fields) {
  return Object.keys(fields).sort().map(k => [k, canonical(fields[k])]);
}

// Plan de una colección: qué se crea, qué se actualiza y qué queda igual.
// sourceDocs / targetDocs: { id: fields } con fields en formato REST.
export function planCollection({ sourceDocs, targetDocs, from, to, excludeFields = [] }) {
  const items = [];
  for (const id of Object.keys(sourceDocs).sort()) {
    const fields = rewriteFields(sourceDocs[id], from, to, [...excludeFields, 'syncedFrom', 'syncedAt']);
    const current = targetDocs[id];
    if (!current) { items.push({ id, action: 'create', fields, changedFields: Object.keys(fields).filter(k => !AUDIT_FIELDS.includes(k)) }); continue; }
    const changedFields = Object.keys(fields).filter(k => !AUDIT_FIELDS.includes(k) && JSON.stringify(canonical(fields[k])) !== JSON.stringify(canonical(current[k])));
    items.push({ id, action: changedFields.length ? 'update' : 'same', fields, changedFields });
  }
  const targetOnly = Object.keys(targetDocs).filter(id => !(id in sourceDocs)).sort();
  return { items, targetOnly };
}

// Cliente REST mínimo: lista documentos crudos y escribe con updateMask.
export function createEnvSyncClient({ projectId, apiKey, databaseId = '(default)', origin = 'https://firestore.googleapis.com', fetchImpl = globalThis.fetch }) {
  const root = `projects/${projectId}/databases/${databaseId}/documents`;
  const base = `${origin}/v1/projects/${projectId}/databases/${encodeURIComponent(databaseId)}/documents`;
  const withKey = url => `${url}${url.includes('?') ? '&' : '?'}key=${encodeURIComponent(apiKey)}`;
  async function request(url, options = {}) {
    const response = await fetchImpl(withKey(url), options);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Firestore ${response.status}: ${(await response.text()).slice(0, 180)}`);
    return response.json();
  }
  return {
    root,
    async list(env, collection) {
      const docs = {};
      let token = '';
      do {
        const page = await request(`${base}/environments/${env}/${collection}?pageSize=300${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`);
        for (const doc of page?.documents || []) docs[decodeURIComponent(doc.name.split('/').pop())] = doc.fields || {};
        token = page?.nextPageToken || '';
      } while (token);
      return docs;
    },
    async write(env, collection, id, fields) {
      const mask = Object.keys(fields).map(k => `updateMask.fieldPaths=${encodeURIComponent(/^[A-Za-z_][A-Za-z0-9_]*$/.test(k) ? k : `\`${k}\``)}`).join('&');
      return request(`${base}/environments/${env}/${collection}/${encodeURIComponent(id)}?${mask}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
    }
  };
}

// Calcula el plan y, con apply, lo escribe. Devuelve un resumen por colección.
export async function syncEnvironments({ client, from, to, keys, apply = false, confirmPrd = false, now = () => new Date().toISOString(), onProgress = () => {} }) {
  assertSyncPair(from, to, { confirmPrd, apply });
  const results = [];
  for (const key of keys) {
    const { collection, label, excludeFields } = syncCollection(key);
    const [sourceDocs, targetDocs] = await Promise.all([client.list(from, collection), client.list(to, collection)]);
    const plan = planCollection({ sourceDocs, targetDocs, from, to, excludeFields });
    let written = 0;
    if (apply) {
      const stamp = now();
      for (const item of plan.items.filter(i => i.action !== 'same')) {
        const fields = { ...item.fields, reference: { referenceValue: `${client.root}/environments/${to}/${collection}/${item.id}` }, syncedFrom: { stringValue: from }, syncedAt: { stringValue: stamp }, updatedAt: { stringValue: stamp } };
        if (!('id' in fields)) fields.id = { stringValue: item.id };
        await client.write(to, collection, item.id, fields);
        written++;
        onProgress({ key, id: item.id, written });
      }
    }
    results.push({ key, collection, label, ...plan, written });
  }
  return results;
}
