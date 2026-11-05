// Puerta de acceso por rol para /settings y /admin. Espera la sesión de
// Firebase Auth (la misma de /login), lee los roles del usuario en el entorno
// y, si no tiene el permiso, tapa la página con un aviso y un enlace a /login.
import { createAuthClient } from '../services/firebase/auth-client.js';
import { createFirestoreAdminClient } from '../services/firebase/firestore-admin-client.js';
import { loadAccess } from '../services/firebase/access.js';
import { usesEmulators } from '../config/environment.js';

const PROJECT = { projectId: 'sayayin-c0dfe', apiKey: 'AIzaSyCC4-wbqtXjfaQ2Y0z8nMg5pAuowEXLxbA' };

function overlay(html) {
  let box = document.querySelector('#access-gate');
  if (!box) {
    box = document.createElement('div');
    box.id = 'access-gate';
    box.className = 'access-gate';
    box.setAttribute('role', 'alert');
    document.body.append(box);
  }
  box.innerHTML = `<div class="access-gate-card">${html}</div>`;
  box.hidden = false;
  return box;
}

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// env: dev | qa | prd. allow(access) decide si entra.
export async function requireAccess({ env, allow, what }) {
  const emulator = usesEmulators();
  const authClient = createAuthClient({ env, emulator });
  const client = createFirestoreAdminClient({
    projectId: emulator ? 'demo-ki-arena' : PROJECT.projectId,
    apiKey: emulator ? 'demo-key' : PROJECT.apiKey,
    origin: emulator ? 'http://127.0.0.1:8080' : 'https://firestore.googleapis.com',
    getToken: async () => authClient.auth.currentUser?.getIdToken() ?? null
  });
  const loginUrl = `/login?env=${encodeURIComponent(env)}${emulator ? '&emulators=1' : ''}`;
  document.body.classList.add('access-pending');
  overlay('<p>Revisando tu rol…</p>');

  const user = await new Promise(resolve => {
    const stop = authClient.onUser(current => { stop(); resolve(current); });
  });
  if (!user) {
    overlay(`<h2>Inicia sesión</h2><p>${escape(what)} es solo para superadministradores.</p><a class="nav-btn" href="${loginUrl}">Entrar</a>`);
    return null;
  }
  let access;
  try {
    access = await loadAccess({ client, env, uid: user.uid });
  } catch (error) {
    overlay(`<h2>No se pudo revisar tu rol</h2><p>${escape(error.message)}</p><a class="nav-btn" href="${loginUrl}">Volver a entrar</a>`);
    return null;
  }
  if (!allow(access)) {
    const who = escape(access.displayName || user.email || user.uid);
    const roles = access.roles.length ? access.roles.map(escape).join(', ') : 'ninguno';
    overlay(`<h2>Sin permiso</h2><p>${who} no tiene permiso para ${escape(what)} en <strong>${escape(env)}</strong>. Roles: ${roles}.</p>
      <p class="settings-help">Un superadministrador puede darte el rol desde el panel.</p><a class="nav-btn" href="${loginUrl}">Mi cuenta</a>`);
    return null;
  }
  document.querySelector('#access-gate')?.remove();
  document.body.classList.remove('access-pending');
  return { access, authClient, client, user, emulator };
}
