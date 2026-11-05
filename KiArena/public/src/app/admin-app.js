// Panel de superadministrador (/admin): usuarios y roles, players, todas las
// tablas con CRUD (crear, editar, agregar campos, desactivar) y configuración.
//
// Reglas de datos que cumple:
// - Nada se borra: «Desactivar» pone isActive=false; «Reactivar» lo vuelve true.
// - Todo registro nuevo lleva id, reference (referencia completa) e isActive.
// - Las relaciones se guardan como referencias completas del mismo entorno.
// - Los campos nuevos son opcionales: se agregan sin tocar los registros viejos
//   (o, con «Agregar campo a toda la tabla», solo a los que no lo tienen).
// - En prd cada escritura pide teclear «prd».
import { resolveAppEnv, ENVIRONMENT_LABELS } from '../config/environment.js';
import { requireAccess } from './access-gate.js';
import { plain, isActiveDoc } from '../services/firebase/firestore-admin-client.js';
import { fieldsToNodes, nodesToFields, renderFieldList, newNode, SYSTEM_FIELDS } from './admin/field-editor.js';

const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const TABLES = Object.freeze([
  { name: 'kiArenaUsers', label: 'Usuarios', help: 'Usuarios de Ki Arena. Los roles se cambian mejor desde «Usuarios y roles».' },
  { name: 'kiArenaRoles', label: 'Roles', help: 'Catálogo de roles: permisos y nivel. superadmin tiene «*».' },
  { name: 'kiArenaUserRoles', label: 'Usuario × rol', help: 'Tabla intermedia usuario-rol ({uid}:{rol}). Revocar = isActive=false.' },
  { name: 'kiArenaRoleInvites', label: 'Invitaciones de rol', help: 'Rol por email para quien aún no ha entrado ({email}:{rol}).' },
  { name: 'kiArenaRaces', label: 'Razas', help: 'Multiplicadores de la raza y su utilidad.' },
  { name: 'kiArenaPlayerTypes', label: 'Tipos de personaje', help: 'Personajes (goku, piccolo, …) con su raza (raceRef).' },
  { name: 'kiArenaPowers', label: 'Poderes', help: 'Poderes por raza: comando, nivel, enfriamiento, multiplicadores y tamaño.' },
  { name: 'kiArenaPlayers', label: 'Players', help: 'Perfiles de juego: usuario × tipo de personaje, con nivel y progreso.' },
  { name: 'kiArenaPlayerPowers', label: 'Player × poder', help: 'Poderes desbloqueados por cada player.' },
  { name: 'kiArenaProviderTypes', label: 'Tipos de proveedor', help: 'Catálogo de login (Google, Twitch, Kick, TikTok, …). Nunca guardes secretos aquí.' },
  { name: 'kiArenaProviders', label: 'Proveedores (cuentas externas)', help: 'Datos de la cuenta externa con la que se autentica.' },
  { name: 'kiArenaUserProviders', label: 'Usuario × proveedor', help: 'Vínculos usuario-cuenta externa.' },
  { name: 'kiArenaUserProviderEvents', label: 'Eventos de vínculos', help: 'Auditoría de vincular, desvincular y conflictos.' },
  { name: 'kiArenaSettings', label: 'Settings', help: 'Ajustes globales del juego.' },
  { name: 'kiArenaMessages', label: 'Mensajes del chat', help: 'Mensajes recibidos por el bot.' },
  { name: 'kiArenaEvents', label: 'Eventos de combate', help: 'Registro de golpes, muertes y subidas de nivel.' }
]);

// Campos que llena el sistema al guardar; no van en la plantilla de un registro nuevo.
const AUTO_FIELDS = new Set(['id', 'reference', 'isActive', 'createdAt', 'updatedAt', 'updatedByRef', 'deactivatedAt', 'cancelledAt', 'migratedAt', 'syncedAt', 'syncedFrom']);
const PREFERRED_COLUMNS = ['code', 'name', 'displayName', 'email', 'username', 'command', 'raceRef', 'playerTypeRef', 'userRef', 'roleRef', 'playerRef', 'powerRef', 'level', 'unlockLevel', 'order'];

const state = {
  env: 'dev', gate: null, client: null, meRef: null, me: null,
  cache: new Map(), // nombre de tabla → docs
  roles: [], tab: 'users'
};

// ---------- Utilidades ----------
function status(text, kind = '') {
  const box = $('#admin-status');
  box.textContent = text;
  box.dataset.state = kind;
}
const base = () => `environments/${state.env}`;
const tablePath = name => `${base()}/${name}`;
const now = () => new Date().toISOString();
const refTo = path => state.client.ref(path);
const shortRef = path => String(path || '').split('/').slice(-2).join('/');
const lastSegment = path => String(path || '').split('/').pop();

async function load(name, { force = false } = {}) {
  if (!force && state.cache.has(name)) return state.cache.get(name);
  const docs = await state.client.list(tablePath(name));
  state.cache.set(name, docs);
  return docs;
}

function confirmWrite(what) {
  if (state.env !== 'prd') return true;
  return window.prompt(`Vas a escribir en PRODUCCIÓN: ${what}.\nEscribe prd para confirmar.`)?.trim().toLowerCase() === 'prd';
}

// Escribe con los campos de auditoría. isNew agrega id, reference, isActive y createdAt.
async function write(path, fields, { remove = [], isNew = false } = {}) {
  const stamped = { ...fields, updatedAt: { stringValue: now() }, updatedByRef: state.meRef };
  if (isNew) {
    Object.assign(stamped, {
      id: { stringValue: lastSegment(path) },
      reference: refTo(path),
      isActive: fields.isActive || { booleanValue: true },
      createdAt: fields.createdAt || { stringValue: now() }
    });
  }
  return state.client.patch(path, stamped, { remove, ...(isNew ? { mustExist: false } : {}) });
}

function cell(value) {
  const v = plain(value);
  if (value && 'referenceValue' in value) return `<code>${escape(shortRef(v))}</code>`;
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (Array.isArray(v)) return `<small>${v.length} elemento${v.length === 1 ? '' : 's'}</small>`;
  if (v && typeof v === 'object') return '<small>{…}</small>';
  const text = String(v ?? '');
  return escape(text.length > 60 ? `${text.slice(0, 57)}…` : text);
}

function pickColumns(docs) {
  const count = new Map();
  for (const doc of docs) {
    for (const [key, value] of Object.entries(doc.fields)) {
      if (AUTO_FIELDS.has(key) || 'mapValue' in value || 'arrayValue' in value) continue;
      count.set(key, (count.get(key) || 0) + 1);
    }
  }
  const keys = [...count.keys()].sort((a, b) => {
    const ia = PREFERRED_COLUMNS.indexOf(a), ib = PREFERRED_COLUMNS.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return count.get(b) - count.get(a) || a.localeCompare(b);
  });
  return keys.slice(0, 6);
}

const matches = (doc, text) => !text || doc.id.toLowerCase().includes(text) || Object.values(doc.fields).some(v => String(JSON.stringify(plain(v))).toLowerCase().includes(text));

function renderDocTable(table, docs, { search = '', showInactive = false, columns, onEdit, onToggle, limit = 300 }) {
  const text = search.trim().toLowerCase();
  const rows = docs.filter(doc => (showInactive || isActiveDoc(doc)) && matches(doc, text));
  const cols = columns || pickColumns(docs);
  table.innerHTML = `<thead><tr><th>id</th>${cols.map(c => `<th>${escape(c)}</th>`).join('')}<th>Estado</th><th></th></tr></thead>
    <tbody>${rows.slice(0, limit).map(doc => `<tr data-id="${escape(doc.id)}" class="${isActiveDoc(doc) ? '' : 'inactive'}">
      <td><code>${escape(doc.id)}</code></td>${cols.map(c => `<td>${doc.fields[c] ? cell(doc.fields[c]) : '<small class="muted">—</small>'}</td>`).join('')}
      <td>${isActiveDoc(doc) ? '<span class="pill ok">Activo</span>' : '<span class="pill off">Desactivado</span>'}</td>
      <td class="row-actions"><button type="button" data-edit>Editar</button><button type="button" data-toggle>${isActiveDoc(doc) ? 'Desactivar' : 'Reactivar'}</button></td>
    </tr>`).join('') || `<tr><td colspan="${cols.length + 3}" class="muted">Sin registros${text ? ' para esa búsqueda' : ''}.</td></tr>`}</tbody>`;
  if (rows.length > limit) table.querySelector('tbody').insertAdjacentHTML('beforeend', `<tr><td colspan="${cols.length + 3}" class="muted">Se muestran ${limit} de ${rows.length}. Usa la búsqueda.</td></tr>`);
  table.onclick = event => {
    const row = event.target.closest('tr[data-id]');
    if (!row) return;
    const doc = docs.find(d => d.id === row.dataset.id);
    if (event.target.matches('[data-edit]')) onEdit(doc);
    if (event.target.matches('[data-toggle]')) onToggle(doc);
  };
}

async function toggleActive(name, doc, after) {
  const active = isActiveDoc(doc);
  if (name === 'kiArenaUsers' && doc.id === state.gate.user.uid && active) return status('No puedes desactivar tu propio usuario.', 'error');
  if (!confirmWrite(`${active ? 'desactivar' : 'reactivar'} ${name}/${doc.id}`)) return;
  try {
    await write(doc.path, { isActive: { booleanValue: !active }, ...(active ? { deactivatedAt: { stringValue: now() } } : {}) });
    await load(name, { force: true });
    await after();
    status(`${name}/${doc.id} ${active ? 'desactivado (no se borró nada)' : 'reactivado'}.`, 'ok');
  } catch (error) {
    status(`No se pudo guardar: ${error.message}`, 'error');
  }
}

// ---------- Editor genérico de registros ----------
const editorCtx = () => ({
  env: state.env,
  lockSystem: true,
  collections: TABLES.map(t => ({ name: t.name, label: t.label })),
  loadIds: async name => (await load(name)).map(d => d.id)
});

// Plantilla de un registro nuevo: la forma de un registro existente, vacía.
function emptyLike(nodes) {
  return nodes.filter(n => !AUTO_FIELDS.has(n.key)).map(n => {
    const copy = newNode(n.key, n.type, undefined, state.env);
    if (n.type === 'reference') copy.value = String(n.value || '').split('/').slice(0, 3).join('/') + '/';
    if (n.type === 'map') copy.children = emptyLike(n.children || []);
    return copy;
  });
}

function openDocEditor({ name, doc = null, after = () => {} }) {
  const dialog = $('#doc-dialog');
  const isNew = !doc;
  const docs = state.cache.get(name) || [];
  let nodes;
  if (isNew) {
    const sample = docs.find(isActiveDoc) || docs[0];
    nodes = sample ? emptyLike(fieldsToNodes(sample.fields)) : [];
  } else {
    nodes = fieldsToNodes(doc.fields);
    nodes.forEach(n => { n.existing = true; });
  }
  const original = isNew ? {} : doc.fields;
  $('#doc-dialog-title').textContent = isNew ? `Nuevo registro en ${name}` : `${name} / ${doc.id}`;
  $('#doc-dialog-path').innerHTML = isNew
    ? `<label class="admin-inline">id del registro <input id="doc-new-id" placeholder="vacío = id automático"></label> Se agregan solos: id, reference, isActive=true, createdAt, updatedAt.`
    : `<code>${escape(doc.path)}</code> · los campos <code>id</code> y <code>reference</code> los pone el sistema.`;
  renderFieldList($('#doc-dialog-body'), nodes, editorCtx());
  const toggle = $('#doc-toggle-active');
  toggle.hidden = isNew;
  if (!isNew) {
    toggle.textContent = isActiveDoc(doc) ? 'Desactivar' : 'Reactivar';
    toggle.onclick = async () => { dialog.close(); await toggleActive(name, doc, after); };
  }
  $('#doc-dialog-status').textContent = '';
  dialog.returnValue = '';
  dialog.onclose = null;
  $('#doc-form').onsubmit = async event => {
    if (event.submitter?.value !== 'save') return;
    event.preventDefault();
    const statusBox = $('#doc-dialog-status');
    try {
      const fields = nodesToFields(nodes.filter(n => !SYSTEM_FIELDS.has(n.key)), state.client.root);
      const changed = Object.fromEntries(Object.entries(fields).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(original[k])));
      const removed = Object.keys(original).filter(k => !SYSTEM_FIELDS.has(k) && !(k in fields));
      if (!isNew && !Object.keys(changed).length && !removed.length) { statusBox.textContent = 'No hay cambios.'; return; }
      const id = isNew ? ($('#doc-new-id').value.trim() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`) : doc.id;
      if (id.includes('/')) throw new Error('El id no puede tener «/».');
      if (isNew && docs.some(d => d.id === id)) throw new Error(`Ya existe ${id} en ${name}.`);
      if (removed.length && !window.confirm(`Vas a quitar ${removed.length} campo(s) de este registro: ${removed.join(', ')}. ¿Seguir?`)) return;
      if (!confirmWrite(`${isNew ? 'crear' : 'editar'} ${name}/${id}`)) return;
      await write(`${tablePath(name)}/${id}`, isNew ? fields : changed, { remove: removed, isNew });
      await load(name, { force: true });
      dialog.close();
      await after();
      status(`${name}/${id} ${isNew ? 'creado' : 'guardado'}.`, 'ok');
    } catch (error) {
      statusBox.textContent = error.message;
      statusBox.dataset.state = 'error';
    }
  };
  dialog.showModal();
}

// ---------- Usuarios y roles ----------
async function renderUsers({ force = false } = {}) {
  status('Cargando usuarios…');
  const [users, rows, invites, roles] = await Promise.all([
    load('kiArenaUsers', { force }), load('kiArenaUserRoles', { force }), load('kiArenaRoleInvites', { force }), load('kiArenaRoles', { force })
  ]);
  state.roles = roles.filter(isActiveDoc).sort((a, b) => (plain(a.fields.order) ?? 99) - (plain(b.fields.order) ?? 99));
  const rolesOf = uid => rows.filter(r => isActiveDoc(r) && lastSegment(plain(r.fields.userRef)) === uid).map(r => lastSegment(plain(r.fields.roleRef)));
  const text = $('#users-search').value.trim().toLowerCase();
  const showInactive = $('#users-inactive').checked;
  const list = users.filter(u => (showInactive || isActiveDoc(u)) && matches(u, text));
  $('#users-table').innerHTML = `<thead><tr><th>Nombre</th><th>Email</th><th>Roles</th><th>Cuentas</th><th>Último login</th><th>Estado</th><th></th></tr></thead><tbody>${list.map(user => {
    const f = user.fields;
    const codes = rolesOf(user.id);
    const accounts = (plain(f.providerTypeRefs) || []).map(lastSegment);
    return `<tr data-id="${escape(user.id)}" class="${isActiveDoc(user) ? '' : 'inactive'}">
      <td><strong>${escape(plain(f.displayName) || '—')}</strong><br><small class="muted"><code>${escape(user.id)}</code></small></td>
      <td>${escape(plain(f.email) || '—')}</td>
      <td>${codes.map(c => `<span class="pill role role-${escape(c)}">${escape(c)}</span>`).join(' ') || '<small class="muted">sin rol</small>'}</td>
      <td>${accounts.map(escape).join(', ') || '—'}</td>
      <td><small>${escape(String(plain(f.lastLoginAt) || '—').replace('T', ' ').slice(0, 16))}</small></td>
      <td>${isActiveDoc(user) ? '<span class="pill ok">Activo</span>' : '<span class="pill off">Desactivado</span>'}</td>
      <td class="row-actions"><button type="button" data-user>Perfil y roles</button></td>
    </tr>`;
  }).join('') || '<tr><td colspan="7" class="muted">Todavía no hay usuarios en este entorno. Se crean al entrar por /login.</td></tr>'}</tbody>`;
  $('#users-table').onclick = event => {
    const row = event.target.closest('tr[data-id]');
    if (row && event.target.matches('[data-user]')) openUser(users.find(u => u.id === row.dataset.id), rolesOf(row.dataset.id));
  };
  $('#invite-role').innerHTML = state.roles.map(r => `<option value="${escape(r.id)}">${escape(plain(r.fields.name) || r.id)}</option>`).join('');
  renderInvites(invites);
  status(`${users.length} usuarios en ${state.env}.`);
}

function renderInvites(invites) {
  const sorted = [...invites].sort((a, b) => String(plain(b.fields.createdAt)).localeCompare(String(plain(a.fields.createdAt))));
  $('#invites-table').innerHTML = sorted.length ? `<thead><tr><th>Email</th><th>Rol</th><th>Estado</th><th>Usado por</th><th></th></tr></thead><tbody>${sorted.map(inv => {
    const f = inv.fields;
    const used = plain(f.usedAt);
    const state_ = isActiveDoc(inv) ? '<span class="pill warn">Pendiente</span>' : used ? '<span class="pill ok">Usada</span>' : '<span class="pill off">Cancelada</span>';
    return `<tr data-id="${escape(inv.id)}"><td>${escape(plain(f.email))}</td><td>${escape(lastSegment(plain(f.roleRef)))}</td><td>${state_}</td>
      <td>${f.usedByRef ? `<code>${escape(lastSegment(plain(f.usedByRef)))}</code>` : '—'}</td>
      <td class="row-actions">${isActiveDoc(inv) ? '<button type="button" data-cancel>Cancelar</button>' : ''}</td></tr>`;
  }).join('')}</tbody>` : '<tbody><tr><td class="muted">Sin invitaciones.</td></tr></tbody>';
  $('#invites-table').onclick = async event => {
    const row = event.target.closest('tr[data-id]');
    if (!row || !event.target.matches('[data-cancel]')) return;
    if (!confirmWrite(`cancelar invitación ${row.dataset.id}`)) return;
    await write(`${tablePath('kiArenaRoleInvites')}/${row.dataset.id}`, { isActive: { booleanValue: false }, cancelledAt: { stringValue: now() } });
    await renderUsers({ force: true });
    status(`Invitación ${row.dataset.id} cancelada.`, 'ok');
  };
}

async function invite(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const email = form.email.value.trim().toLowerCase();
  const role = form.role.value;
  if (!email.includes('@') || !role) return;
  const users = await load('kiArenaUsers');
  const existing = users.find(u => String(plain(u.fields.email) || '').toLowerCase() === email && isActiveDoc(u));
  if (existing) {
    status(`${email} ya tiene usuario: dale el rol con «Perfil y roles».`, 'error');
    return openUser(existing);
  }
  if (!confirmWrite(`invitar ${email} como ${role}`)) return;
  const id = `${email}:${role}`;
  const path = `${tablePath('kiArenaRoleInvites')}/${id}`;
  const fields = { email: { stringValue: email }, roleRef: refTo(`${tablePath('kiArenaRoles')}/${role}`), createdByRef: state.meRef, source: { stringValue: 'admin' }, usedAt: { nullValue: null }, usedByRef: { nullValue: null }, isActive: { booleanValue: true } };
  const already = (await load('kiArenaRoleInvites')).some(d => d.id === id);
  await write(path, fields, { isNew: !already });
  form.reset();
  await renderUsers({ force: true });
  status(`Invitación creada: ${email} recibirá ${role} al entrar en ${state.env}.`, 'ok');
}

async function openUser(user, currentRoles) {
  const dialog = $('#user-dialog');
  const rows = await load('kiArenaUserRoles');
  const roleCodes = currentRoles || rows.filter(r => isActiveDoc(r) && lastSegment(plain(r.fields.userRef)) === user.id).map(r => lastSegment(plain(r.fields.roleRef)));
  const players = (await load('kiArenaPlayers')).filter(p => lastSegment(plain(p.fields.userRef)) === user.id);
  const isMe = user.id === state.gate.user.uid;
  const f = user.fields;
  $('#user-dialog-title').textContent = plain(f.displayName) || user.id;
  $('#user-dialog-body').innerHTML = `
    <div class="settings-grid">
      <label><span>Nombre visible</span><input name="displayName" maxlength="40" value="${escape(plain(f.displayName) || '')}"></label>
      <label><span>Email</span><input value="${escape(plain(f.email) || '')}" readonly><small>Lo da el proveedor de login.</small></label>
      <label><span>Avatar (URL)</span><input name="avatarUrl" value="${escape(plain(f.avatarUrl) || '')}"></label>
      <label class="character-setting"><span>Usuario activo</span><input type="checkbox" name="isActive" ${isActiveDoc(user) ? 'checked' : ''} ${isMe ? 'disabled' : ''}></label>
    </div>
    <h3>Roles en ${escape(state.env)}</h3>
    <div class="character-settings">${state.roles.map(role => {
      const code = role.id;
      const lock = isMe && code === 'superadmin';
      return `<label class="character-setting"><span><strong>${escape(plain(role.fields.name) || code)}</strong> <code>${escape(code)}</code> · nivel ${escape(plain(role.fields.level) ?? '—')}<br><small>${escape(plain(role.fields.description) || '')}</small></span>
        <input type="checkbox" data-role="${escape(code)}" ${roleCodes.includes(code) ? 'checked' : ''} ${lock ? 'disabled title="No puedes quitarte superadmin a ti mismo"' : ''}></label>`;
    }).join('')}</div>
    <h3>Players (perfiles de juego)</h3>
    ${players.length ? `<ul class="admin-list">${players.map(p => `<li><code>${escape(p.id)}</code> ${escape(plain(p.fields.name) || '')} · ${escape(shortRef(plain(p.fields.playerTypeRef)))} · nivel ${escape(plain(p.fields.level) ?? '—')}</li>`).join('')}</ul>` : '<p class="settings-help">Este usuario aún no tiene players ligados (userRef).</p>'}
    <p class="settings-help"><code>${escape(user.path)}</code></p>`;
  $('#user-dialog-status').textContent = '';
  $('#user-edit-raw').onclick = () => { dialog.close(); openDocEditor({ name: 'kiArenaUsers', doc: user, after: () => renderUsers({ force: true }) }); };
  $('#user-form').onsubmit = async event => {
    if (event.submitter?.value !== 'save') return;
    event.preventDefault();
    const form = event.currentTarget;
    const wanted = [...form.querySelectorAll('[data-role]')].filter(i => i.checked).map(i => i.dataset.role);
    if (isMe && !wanted.includes('superadmin')) wanted.push('superadmin');
    const added = wanted.filter(c => !roleCodes.includes(c));
    const removed = roleCodes.filter(c => !wanted.includes(c));
    const userPath = user.path;
    try {
      if (!confirmWrite(`cambiar perfil y roles de ${user.id}`)) return;
      const stamp = now();
      for (const code of added) {
        const id = `${user.id}:${code}`;
        const exists = rows.some(r => r.id === id);
        await write(`${tablePath('kiArenaUserRoles')}/${id}`, {
          userRef: refTo(userPath), roleRef: refTo(`${tablePath('kiArenaRoles')}/${code}`), isActive: { booleanValue: true },
          grantedByRef: state.meRef, grantedAt: { stringValue: stamp }, revokedAt: { nullValue: null }, source: { stringValue: 'admin' }
        }, { isNew: !exists });
      }
      for (const code of removed) {
        await write(`${tablePath('kiArenaUserRoles')}/${user.id}:${code}`, { isActive: { booleanValue: false }, revokedAt: { stringValue: stamp }, revokedByRef: state.meRef });
      }
      const fields = {
        displayName: { stringValue: form.displayName.value.trim().slice(0, 40) || plain(f.displayName) || '' },
        roleRefs: { arrayValue: { values: wanted.map(code => refTo(`${tablePath('kiArenaRoles')}/${code}`)) } },
        roles: { arrayValue: { values: wanted.map(code => ({ stringValue: code })) } }
      };
      const avatar = form.avatarUrl.value.trim();
      if (avatar || f.avatarUrl) fields.avatarUrl = avatar ? { stringValue: avatar } : { nullValue: null };
      if (!isMe) fields.isActive = { booleanValue: form.isActive.checked };
      await write(userPath, fields);
      dialog.close();
      await renderUsers({ force: true });
      status(`Guardado ${plain(f.displayName) || user.id}${added.length || removed.length ? `: ${[...added.map(c => `+${c}`), ...removed.map(c => `−${c}`)].join(', ')}` : ''}.`, 'ok');
    } catch (error) {
      $('#user-dialog-status').textContent = error.message;
      $('#user-dialog-status').dataset.state = 'error';
    }
  };
  dialog.showModal();
}

// ---------- Players, tablas y configuración ----------
async function renderPlayers({ force = false } = {}) {
  status('Cargando players…');
  const docs = await load('kiArenaPlayers', { force });
  const columns = ['name', 'playerTypeRef', 'userRef', 'level', 'xp', 'kills', 'deaths'].filter(c => docs.some(d => c in d.fields));
  renderDocTable($('#players-table'), docs, {
    search: $('#players-search').value, showInactive: $('#players-inactive').checked, columns,
    onEdit: doc => openDocEditor({ name: 'kiArenaPlayers', doc, after: () => renderPlayers() }),
    onToggle: doc => toggleActive('kiArenaPlayers', doc, () => renderPlayers())
  });
  status(`${docs.length} players en ${state.env}.`);
}

async function renderTables({ force = false } = {}) {
  const name = $('#tables-collection').value;
  const table = TABLES.find(t => t.name === name);
  $('#tables-help').innerHTML = `${escape(table.help)} <code>${escape(tablePath(name))}</code>`;
  status(`Cargando ${table.label}…`);
  const docs = await load(name, { force });
  renderDocTable($('#tables-table'), docs, {
    search: $('#tables-search').value, showInactive: $('#tables-inactive').checked,
    onEdit: doc => openDocEditor({ name, doc, after: () => renderTables() }),
    onToggle: doc => toggleActive(name, doc, () => renderTables())
  });
  status(`${table.label}: ${docs.length} registros (${docs.filter(isActiveDoc).length} activos).`);
}

async function renderConfig({ force = false } = {}) {
  const docs = await load('kiArenaSettings', { force });
  renderDocTable($('#config-table'), docs, {
    showInactive: true,
    onEdit: doc => openDocEditor({ name: 'kiArenaSettings', doc, after: () => renderConfig() }),
    onToggle: doc => toggleActive('kiArenaSettings', doc, () => renderConfig())
  });
  status(`Configuración de ${state.env}: ${docs.length} documento(s).`);
}

function openAddField() {
  const name = $('#tables-collection').value;
  const dialog = $('#field-dialog');
  const nodes = [newNode('', 'string', '', state.env)];
  $('#field-dialog-table').textContent = name;
  renderFieldList($('#field-dialog-body'), nodes, { ...editorCtx(), lockSystem: true });
  $('#field-dialog-body .field-add')?.remove();
  $('#field-dialog-status').textContent = '';
  $('#field-form').onsubmit = async event => {
    if (event.submitter?.value !== 'save') return;
    event.preventDefault();
    try {
      const [n] = nodes;
      if (!n) throw new Error('Define el campo.');
      const key = String(n.key || '').trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) throw new Error('Usa un nombre tipo camelCase: letras, números y _.');
      if (AUTO_FIELDS.has(key)) throw new Error(`«${key}» lo maneja el sistema.`);
      const fields = nodesToFields([n], state.client.root);
      const docs = await load(name, { force: true });
      const missing = docs.filter(d => !(key in d.fields));
      if (!missing.length) throw new Error(`Todos los registros de ${name} ya tienen «${key}».`);
      if (!window.confirm(`Agregar «${key}» a ${missing.length} de ${docs.length} registros de ${name}?`)) return;
      if (!confirmWrite(`agregar ${key} a ${missing.length} registros de ${name}`)) return;
      let done = 0;
      for (const doc of missing) {
        await write(doc.path, fields);
        $('#field-dialog-status').textContent = `${++done} / ${missing.length}…`;
      }
      await load(name, { force: true });
      dialog.close();
      await renderTables();
      status(`Campo «${key}» agregado a ${done} registros de ${name}.`, 'ok');
    } catch (error) {
      $('#field-dialog-status').textContent = error.message;
      $('#field-dialog-status').dataset.state = 'error';
    }
  };
  dialog.showModal();
}

// ---------- Arranque ----------
const RENDER = { users: renderUsers, players: renderPlayers, tables: renderTables, config: renderConfig };

function selectTab(tab) {
  state.tab = tab;
  document.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  document.querySelectorAll('[data-panel]').forEach(p => { p.hidden = p.dataset.panel !== tab; });
  try { localStorage.setItem('kiArenaAdminTab', tab); } catch { /* sin almacenamiento */ }
  RENDER[tab]().catch(error => status(`No se pudo cargar: ${error.message}`, 'error'));
}

function wire() {
  document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => selectTab(b.dataset.tab)));
  const safe = fn => () => fn().catch(error => status(error.message, 'error'));
  $('#users-search').addEventListener('input', safe(() => renderUsers()));
  $('#users-inactive').addEventListener('change', safe(() => renderUsers()));
  $('#users-reload').addEventListener('click', safe(() => renderUsers({ force: true })));
  $('#invite-form').addEventListener('submit', event => invite(event).catch(error => status(error.message, 'error')));
  $('#players-search').addEventListener('input', safe(() => renderPlayers()));
  $('#players-inactive').addEventListener('change', safe(() => renderPlayers()));
  $('#players-reload').addEventListener('click', safe(() => renderPlayers({ force: true })));
  $('#players-new').addEventListener('click', safe(async () => { await load('kiArenaPlayers'); openDocEditor({ name: 'kiArenaPlayers', after: () => renderPlayers() }); }));
  $('#tables-collection').innerHTML = TABLES.map(t => `<option value="${t.name}">${escape(t.label)} · ${t.name}</option>`).join('');
  $('#tables-collection').addEventListener('change', safe(() => renderTables()));
  $('#tables-search').addEventListener('input', safe(() => renderTables()));
  $('#tables-inactive').addEventListener('change', safe(() => renderTables()));
  $('#tables-reload').addEventListener('click', safe(() => renderTables({ force: true })));
  $('#tables-new').addEventListener('click', safe(async () => { const name = $('#tables-collection').value; await load(name); openDocEditor({ name, after: () => renderTables() }); }));
  $('#tables-add-field').addEventListener('click', openAddField);
  const envSelect = $('#admin-env');
  envSelect.value = state.env;
  envSelect.addEventListener('change', () => {
    const url = new URL(location.href);
    url.searchParams.set('env', envSelect.value);
    location.assign(url.href);
  });
}

async function start() {
  const { env, error } = resolveAppEnv();
  if (error) return status(error, 'error');
  state.env = env;
  const gate = await requireAccess({ env, what: 'usar el panel de superadministrador', allow: access => access.isSuperadmin });
  if (!gate) return;
  state.gate = gate;
  state.client = gate.client;
  state.meRef = gate.client.ref(`${base()}/kiArenaUsers/${gate.user.uid}`);
  const emu = gate.emulator ? '&emulators=1' : '';
  $('#admin-who').textContent = `${gate.access.displayName || gate.user.email || gate.user.uid} · ${gate.access.roles.join(', ')} · ${ENVIRONMENT_LABELS[env]}`;
  $('#nav-arena').href = `/?env=${env === 'prd' ? 'prod' : env}${emu}`;
  $('#nav-settings').href = `/settings?env=${env === 'prd' ? 'prod' : env}${emu}`;
  $('#config-settings-link').href = $('#nav-settings').href;
  $('#nav-bot').href = `/bot?env=${env === 'prd' ? 'prod' : env}${emu}`;
  $('#nav-account').href = `/cuenta?env=${env}${emu}`;
  $('#admin-prd-banner').hidden = env !== 'prd';
  wire();
  let tab = 'users';
  try { tab = localStorage.getItem('kiArenaAdminTab') || 'users'; } catch { /* sin almacenamiento */ }
  selectTab(RENDER[tab] ? tab : 'users');
}

start();
