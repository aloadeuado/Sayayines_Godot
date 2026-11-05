// Editor de campos de un documento de Firestore, con tipos: texto, número,
// sí/no, nulo, referencia, fecha, mapa y lista (anidados). Trabaja sobre un
// árbol de nodos y lo convierte a valores REST al guardar, así no se pierden
// tipos (una referencia sigue siendo referencia, un entero sigue siendo entero).
export const FIELD_TYPES = [
  ['string', 'Texto'], ['number', 'Número'], ['boolean', 'Sí / No'], ['reference', 'Referencia'],
  ['timestamp', 'Fecha'], ['map', 'Mapa'], ['array', 'Lista'], ['null', 'Nulo']
];
// Campos que pone el sistema: se ven pero no se editan a mano.
export const SYSTEM_FIELDS = new Set(['id', 'reference']);

let seq = 0;
const node = (key, type, value, children) => ({ uid: ++seq, key, type, value, children });

export function fromRest(key, value) {
  if (!value || 'nullValue' in value) return node(key, 'null', null);
  if ('stringValue' in value) return node(key, 'string', value.stringValue);
  if ('booleanValue' in value) return node(key, 'boolean', value.booleanValue);
  if ('integerValue' in value) return node(key, 'number', Number(value.integerValue));
  if ('doubleValue' in value) return node(key, 'number', Number(value.doubleValue));
  if ('timestampValue' in value) return node(key, 'timestamp', value.timestampValue);
  if ('referenceValue' in value) return node(key, 'reference', value.referenceValue.split('/documents/').slice(1).join('/documents/'));
  if ('arrayValue' in value) return node(key, 'array', null, (value.arrayValue.values || []).map(v => fromRest(null, v)));
  if ('mapValue' in value) return node(key, 'map', null, fieldsToNodes(value.mapValue.fields || {}));
  return node(key, 'string', JSON.stringify(value));
}

export const fieldsToNodes = fields => Object.keys(fields).sort(sortKeys).map(key => fromRest(key, fields[key]));

const ORDER = ['id', 'reference', 'isActive', 'code', 'name', 'displayName', 'email'];
function sortKeys(a, b) {
  const ia = ORDER.indexOf(a), ib = ORDER.indexOf(b);
  if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  return a.localeCompare(b);
}

export function toRest(n, root) {
  switch (n.type) {
    case 'string': return { stringValue: String(n.value ?? '') };
    case 'number': {
      const num = Number(n.value);
      if (!Number.isFinite(num)) throw new Error(`«${n.key ?? 'elemento'}» no es un número válido.`);
      return Number.isInteger(num) ? { integerValue: String(num) } : { doubleValue: num };
    }
    case 'boolean': return { booleanValue: n.value === true || n.value === 'true' };
    case 'timestamp': {
      const date = new Date(n.value);
      if (Number.isNaN(date.getTime())) throw new Error(`«${n.key ?? 'elemento'}» no es una fecha válida.`);
      return { timestampValue: date.toISOString() };
    }
    case 'reference': {
      const path = String(n.value || '').replace(/^\/+/, '');
      if (path.split('/').length % 2 !== 0 || !path) throw new Error(`«${n.key ?? 'elemento'}»: elige tabla y registro de la referencia.`);
      return { referenceValue: `${root}/${path}` };
    }
    case 'array': return { arrayValue: { values: (n.children || []).map(c => toRest(c, root)) } };
    case 'map': return { mapValue: { fields: nodesToFields(n.children || [], root) } };
    default: return { nullValue: null };
  }
}

export function nodesToFields(nodes, root) {
  const fields = {};
  for (const n of nodes) {
    const key = String(n.key || '').trim();
    if (!key) throw new Error('Hay un campo sin nombre.');
    if (key in fields) throw new Error(`El campo «${key}» está repetido.`);
    fields[key] = toRest(n, root);
  }
  return fields;
}

function emptyValue(type, env) {
  if (type === 'number') return 0;
  if (type === 'boolean') return false;
  if (type === 'timestamp') return new Date().toISOString();
  if (type === 'reference') return `environments/${env}/`;
  return '';
}

function el(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') element.className = value;
    else if (key.startsWith('on')) element.addEventListener(key.slice(2), value);
    else if (value === true) element.setAttribute(key, '');
    else if (value !== false && value !== undefined && value !== null) element.setAttribute(key, value);
  }
  for (const child of children.flat()) if (child !== null && child !== undefined) element.append(child);
  return element;
}

// ctx: { env, collections: [{name,label}], loadIds(collectionName) → Promise<string[]>, lockSystem }
export function renderFieldList(container, nodes, ctx, { isArray = false, depth = 0 } = {}) {
  container.replaceChildren();
  const list = el('div', { class: `field-list depth-${Math.min(depth, 3)}` });
  nodes.forEach((n, index) => list.append(renderRow(n, index, nodes, ctx, { isArray, depth, rerender: () => renderFieldList(container, nodes, ctx, { isArray, depth }) })));
  const add = el('button', {
    type: 'button', class: 'field-add',
    onclick: () => {
      nodes.push(node(isArray ? null : '', 'string', ''));
      renderFieldList(container, nodes, ctx, { isArray, depth });
      container.querySelector('.field-row:last-of-type input')?.focus();
    }
  }, isArray ? '+ Agregar elemento' : '+ Agregar campo');
  container.append(list, add);
}

function renderRow(n, index, siblings, ctx, { isArray, depth, rerender }) {
  const locked = depth === 0 && ctx.lockSystem && SYSTEM_FIELDS.has(n.key);
  const row = el('div', { class: `field-row${locked ? ' locked' : ''}` });
  const name = isArray
    ? el('span', { class: 'field-index' }, `#${index + 1}`)
    : el('input', { class: 'field-name', value: n.key ?? '', placeholder: 'nombreDelCampo', readonly: locked || (n.existing && depth === 0) ? true : undefined, oninput: e => { n.key = e.target.value; } });
  const type = el('select', {
    class: 'field-type', disabled: locked ? true : undefined,
    onchange: e => {
      n.type = e.target.value;
      n.children = ['map', 'array'].includes(n.type) ? [] : undefined;
      n.value = emptyValue(n.type, ctx.env);
      rerender();
    }
  }, FIELD_TYPES.map(([value, label]) => el('option', { value, selected: value === n.type ? true : undefined }, label)));
  const remove = locked ? el('span') : el('button', {
    type: 'button', class: 'field-remove', title: isArray ? 'Quitar elemento' : 'Quitar campo',
    onclick: () => { siblings.splice(siblings.indexOf(n), 1); rerender(); }
  }, '✕');
  row.append(name, type, renderValue(n, ctx, depth, locked), remove);
  return row;
}

function renderValue(n, ctx, depth, locked) {
  const wrap = el('div', { class: 'field-value' });
  const set = value => { n.value = value; };
  switch (n.type) {
    case 'string': {
      const long = String(n.value ?? '').length > 70;
      wrap.append(el(long ? 'textarea' : 'input', { value: long ? undefined : n.value ?? '', rows: long ? 4 : undefined, readonly: locked ? true : undefined, oninput: e => set(e.target.value) }, long ? String(n.value) : null));
      break;
    }
    case 'number':
      wrap.append(el('input', { type: 'number', step: 'any', value: n.value ?? 0, oninput: e => set(e.target.value) }));
      break;
    case 'boolean':
      wrap.append(el('select', { onchange: e => set(e.target.value === 'true') },
        el('option', { value: 'true', selected: n.value === true ? true : undefined }, 'Sí (true)'),
        el('option', { value: 'false', selected: n.value !== true ? true : undefined }, 'No (false)')));
      break;
    case 'timestamp':
      wrap.append(el('input', { value: n.value ?? '', placeholder: '2026-11-05T12:00:00Z', oninput: e => set(e.target.value) }));
      break;
    case 'reference': wrap.append(referenceEditor(n, ctx, locked)); break;
    case 'map':
    case 'array': {
      const box = el('div', { class: 'field-nested' });
      renderFieldList(box, n.children ||= [], ctx, { isArray: n.type === 'array', depth: depth + 1 });
      wrap.append(box);
      break;
    }
    default:
      wrap.append(el('span', { class: 'field-null' }, 'null'));
  }
  return wrap;
}

// Referencia completa: environments/{env}/{tabla}/{id}. Se elige tabla y registro.
function referenceEditor(n, ctx, locked) {
  const parts = String(n.value || '').split('/');
  const env = parts[1] || ctx.env;
  const collection = parts[2] || '';
  const id = parts.slice(3).join('/');
  const box = el('div', { class: 'ref-editor' });
  const listId = `ref-ids-${n.uid}`;
  const datalist = el('datalist', { id: listId });
  const update = () => { n.value = `environments/${env}/${table.value}/${idInput.value.trim()}`; full.textContent = n.value; };
  const loadIds = async () => {
    datalist.replaceChildren();
    if (!table.value) return;
    const ids = await ctx.loadIds(table.value).catch(() => []);
    datalist.append(...ids.map(value => el('option', { value })));
  };
  const known = ctx.collections.some(c => c.name === collection);
  const table = el('select', { disabled: locked ? true : undefined, onchange: () => { update(); loadIds(); } },
    el('option', { value: '' }, 'Tabla…'),
    ...(!known && collection ? [el('option', { value: collection, selected: true }, collection)] : []),
    ...ctx.collections.map(c => el('option', { value: c.name, selected: c.name === collection ? true : undefined }, c.label)));
  const idInput = el('input', { list: listId, value: id, placeholder: 'id del registro', readonly: locked ? true : undefined, oninput: update, onfocus: () => { if (!datalist.childElementCount) loadIds(); } });
  const full = el('small', { class: 'ref-full' }, n.value || '');
  if (env !== ctx.env) full.classList.add('ref-other-env');
  box.append(table, idInput, datalist, full);
  return box;
}

export function newNode(key, type, value, env) {
  const n = node(key, type, value ?? emptyValue(type, env), ['map', 'array'].includes(type) ? [] : undefined);
  return n;
}
