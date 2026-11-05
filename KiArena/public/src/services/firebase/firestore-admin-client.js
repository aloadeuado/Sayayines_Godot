// Cliente REST de Firestore para el panel de superadministrador y la puerta de
// acceso por rol. Trabaja con los valores crudos de la API REST
// ({stringValue}, {referenceValue}, ...) para no perder tipos al editar.
// Si hay sesión, manda el ID token del usuario (para cuando las reglas de
// Firestore exijan rol).
//
// Reglas de datos: nunca borra documentos (borrar = isActive=false); todo
// documento nuevo lleva id, reference (referencia completa) e isActive.
const SIMPLE_FIELD = /^[A-Za-z_][A-Za-z0-9_]*$/;
export const quoteField = key => (SIMPLE_FIELD.test(key) ? key : `\`${String(key).replace(/[`\\]/g, c => `\\${c}`)}\``);

export function createFirestoreAdminClient({ projectId, apiKey, databaseId = '(default)', origin = 'https://firestore.googleapis.com', getToken = async () => null, fetchImpl = globalThis.fetch.bind(globalThis) }) {
  const root = `projects/${projectId}/databases/${databaseId}/documents`;
  const base = `${origin}/v1/projects/${projectId}/databases/${encodeURIComponent(databaseId)}/documents`;
  const withKey = url => `${url}${url.includes('?') ? '&' : '?'}key=${encodeURIComponent(apiKey)}`;
  const docUrl = path => `${base}/${path.split('/').map(encodeURIComponent).join('/')}`;
  const pathOf = name => name.split('/documents/').slice(1).join('/documents/');

  async function request(url, options = {}) {
    const token = await getToken().catch(() => null);
    const response = await fetchImpl(withKey(url), {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
    });
    if (response.status === 404 && options.allow404) return null;
    if (!response.ok) throw new Error(`Firestore ${response.status}: ${(await response.text()).slice(0, 220)}`);
    return response.json();
  }

  const toDoc = raw => ({ id: decodeURIComponent(raw.name.split('/').pop()), path: pathOf(raw.name), fields: raw.fields || {}, updateTime: raw.updateTime });

  return {
    root,
    ref: path => ({ referenceValue: `${root}/${path}` }),
    pathOf,
    async list(collectionPath) {
      const docs = [];
      let token = '';
      do {
        const page = await request(`${docUrl(collectionPath)}?pageSize=300${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`, { allow404: true });
        for (const raw of page?.documents || []) docs.push(toDoc(raw));
        token = page?.nextPageToken || '';
      } while (token);
      return docs;
    },
    async get(path) {
      const raw = await request(docUrl(path), { allow404: true });
      return raw ? toDoc(raw) : null;
    },
    // Igualdad sobre uno o más campos: [[campo, valorREST], ...].
    async where(collectionPath, filters) {
      const slash = collectionPath.lastIndexOf('/');
      const fieldFilters = filters.map(([field, value]) => ({ fieldFilter: { field: { fieldPath: quoteField(field) }, op: 'EQUAL', value } }));
      const structuredQuery = { from: [{ collectionId: collectionPath.slice(slash + 1) }] };
      if (fieldFilters.length === 1) structuredQuery.where = fieldFilters[0];
      if (fieldFilters.length > 1) structuredQuery.where = { compositeFilter: { op: 'AND', filters: fieldFilters } };
      const rows = await request(`${docUrl(collectionPath.slice(0, slash))}:runQuery`, { method: 'POST', body: JSON.stringify({ structuredQuery }) });
      return (rows || []).filter(row => row.document).map(row => toDoc(row.document));
    },
    // Escribe solo los campos de `fields`; los de `remove` se quitan del documento.
    async patch(path, fields, { remove = [], mustExist } = {}) {
      const mask = [...Object.keys(fields), ...remove].map(k => `updateMask.fieldPaths=${encodeURIComponent(quoteField(k))}`).join('&');
      const precondition = mustExist === undefined ? '' : `&currentDocument.exists=${mustExist}`;
      return toDoc(await request(`${docUrl(path)}?${mask}${precondition}`, { method: 'PATCH', body: JSON.stringify({ fields }) }));
    }
  };
}

// ---------- Valores REST ----------
export const rest = {
  string: v => ({ stringValue: String(v) }),
  bool: v => ({ booleanValue: Boolean(v) }),
  number: v => (Number.isInteger(Number(v)) ? { integerValue: String(Number(v)) } : { doubleValue: Number(v) }),
  nul: () => ({ nullValue: null }),
  array: values => ({ arrayValue: { values } }),
  map: fields => ({ mapValue: { fields } })
};

export function plain(value) {
  if (!value || 'nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('timestampValue' in value) return value.timestampValue;
  if ('referenceValue' in value) return value.referenceValue.split('/documents/').slice(1).join('/documents/');
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(plain);
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([k, v]) => [k, plain(v)]));
  if ('geoPointValue' in value) return value.geoPointValue;
  return null;
}

export const isActiveDoc = doc => plain(doc?.fields?.isActive) !== false;
