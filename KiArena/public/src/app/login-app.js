// Pantalla /login (y /cuenta): entrar, crear guerrero y administrar cuentas vinculadas.
import { resolveAppEnv, APP_ENVIRONMENTS, ENVIRONMENT_LABELS } from '../config/environment.js';
import { createAuthClient, describeError } from '../services/firebase/auth-client.js';

const $ = selector => document.querySelector(selector);
const NATIVE = new Set(['google', 'apple']);
const OAUTH = new Set(['twitch', 'kick', 'tiktok']);
const GLYPHS = { google: 'G', apple: '', twitch: 'T', kick: 'K', tiktok: '♪', password: '@' };
const FALLBACK_TYPES = [
  { code: 'password', name: 'Email y contraseña', allowLogin: true, allowLink: true, configured: true },
  { code: 'google', name: 'Google', allowLogin: true, allowLink: true, configured: true },
  { code: 'twitch', name: 'Twitch', allowLogin: true, allowLink: true, configured: false },
  { code: 'kick', name: 'Kick', allowLogin: true, allowLink: true, configured: false },
  { code: 'tiktok', name: 'TikTok', allowLogin: true, allowLink: true, configured: false }
];
const LINK_MESSAGES = {
  linked: name => [`¡Cuenta de ${name} vinculada!`, 'ok'],
  already_linked: name => [`Tu cuenta de ${name} ya estaba vinculada.`, 'info'],
  conflict: name => [`Esa cuenta de ${name} ya pertenece a otro guerrero de Ki Arena. No se movió.`, 'error'],
  cancelled: name => [`Cancelaste la conexión con ${name}.`, 'info']
};

const state = { env: null, client: null, types: FALLBACK_TYPES, account: null, busy: false };

function alertBox(message, tone = 'error') {
  const box = $('#auth-alert');
  box.hidden = !message;
  box.textContent = message || '';
  box.dataset.tone = tone;
}

function setStatus(message) {
  $('#auth-status').textContent = message || '';
}

function loading(message) {
  $('#auth-loading').hidden = !message;
  $('#auth-loading-text').textContent = message || '';
  if (message) {
    $('#login-panel').hidden = true;
    $('#account-panel').hidden = true;
  }
}

async function busy(message, task) {
  if (state.busy) return;
  state.busy = true;
  alertBox('');
  loading(message);
  try {
    return await task();
  } catch (error) {
    alertBox(describeError(error));
    console.warn(error);
    if (state.client?.auth.currentUser && state.account) showAccount(state.account);
    else showLogin();
  } finally {
    state.busy = false;
    $('#auth-loading').hidden = true;
  }
}

function typeName(code) {
  return state.types.find(type => type.code === code)?.name || code;
}

function providerButton(type, label, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'provider-btn';
  button.dataset.provider = type.code;
  const glyph = document.createElement('span');
  glyph.className = 'glyph';
  glyph.setAttribute('aria-hidden', 'true');
  glyph.textContent = GLYPHS[type.code] || type.code[0].toUpperCase();
  button.append(glyph, label);
  if (!type.configured) {
    button.disabled = true;
    button.title = `${type.name} aún no está configurado en ${state.env}.`;
    const pending = document.createElement('small');
    pending.textContent = ' · pronto';
    button.append(pending);
  }
  if (onClick) button.addEventListener('click', onClick);
  return button;
}

function returnPath(path) {
  return `${path}${window.location.search}`;
}

function renderLoginProviders() {
  const grid = $('#provider-buttons');
  grid.replaceChildren();
  for (const type of state.types) {
    if (type.code === 'password' || !type.allowLogin) continue;
    grid.append(providerButton(type, type.name, () => {
      if (NATIVE.has(type.code)) {
        busy(`Conectando con ${type.name}…`, async () => showAccount((await state.client.loginWithNative(type.code)).account));
      } else if (OAUTH.has(type.code)) {
        busy(`Abriendo ${type.name}…`, () => state.client.startOAuth(type.code, 'login', returnPath('/login')));
      }
    }));
  }
  grid.hidden = grid.childElementCount === 0;
  $('.auth-divider').hidden = grid.hidden;
}

function showLogin() {
  state.account = null;
  $('#account-panel').hidden = true;
  $('#login-panel').hidden = false;
  renderLoginProviders();
}

function showAccount(account) {
  if (!account) return showLogin();
  state.account = account;
  const { user, links } = account;
  $('#login-panel').hidden = true;
  $('#account-panel').hidden = false;
  $('#account-title').textContent = user.displayName || 'Guerrero sin nombre';
  $('#account-email').textContent = user.email || 'Sin email de contacto';
  const avatar = $('#account-avatar');
  avatar.textContent = user.avatarUrl ? '' : (user.displayName || '?').trim().charAt(0).toUpperCase();
  avatar.style.backgroundImage = user.avatarUrl ? `url("${encodeURI(user.avatarUrl)}")` : '';
  $('#name-form').displayName.value = user.displayName || '';

  const list = $('#linked-list');
  list.replaceChildren();
  for (const link of links) {
    const type = state.types.find(t => t.code === link.providerTypeId) || { code: link.providerTypeId, name: link.providerTypeId, configured: true };
    const item = document.createElement('li');
    const icon = providerButton({ ...type, configured: true }, '');
    icon.tabIndex = -1;
    icon.setAttribute('aria-hidden', 'true');
    const name = document.createElement('div');
    name.className = 'linked-name';
    const title = document.createElement('strong');
    title.textContent = type.name;
    if (link.isPrimary) {
      const badge = document.createElement('span');
      badge.className = 'badge-primary';
      badge.textContent = 'Principal';
      title.append(badge);
    }
    const detail = document.createElement('span');
    detail.textContent = link.username ? `@${link.username}` : link.displayName || link.email || '';
    name.append(title, detail);
    const unlink = document.createElement('button');
    unlink.type = 'button';
    unlink.className = 'unlink-btn';
    unlink.textContent = 'Desvincular';
    unlink.disabled = links.length <= 1;
    unlink.title = unlink.disabled ? 'Es tu única forma de entrar.' : '';
    unlink.addEventListener('click', () => {
      if (!window.confirm(`¿Desvincular ${type.name}? Ya no podrás entrar con esa cuenta.`)) return;
      busy('Desvinculando…', async () => {
        const result = await state.client.unlink(link.userProviderId);
        showAccount(result.account);
        alertBox(`${type.name} desvinculado.`, 'info');
      });
    });
    item.append(icon, name, unlink);
    list.append(item);
  }

  const linkedTypes = new Set(links.map(link => link.providerTypeId));
  const grid = $('#link-buttons');
  grid.replaceChildren();
  for (const type of state.types) {
    if (!type.allowLink || linkedTypes.has(type.code)) continue;
    grid.append(providerButton(type, type.name, () => {
      if (type.code === 'password') {
        $('#link-password-form').hidden = false;
        $('#link-password-form').email.focus();
      } else if (NATIVE.has(type.code)) {
        busy(`Vinculando ${type.name}…`, async () => {
          const result = await state.client.linkNative(type.code);
          showAccount(result.account);
          const [message, tone] = (LINK_MESSAGES[result.status] || LINK_MESSAGES.linked)(type.name);
          alertBox(message, tone);
        });
      } else if (OAUTH.has(type.code)) {
        busy(`Abriendo ${type.name}…`, () => state.client.startOAuth(type.code, 'link', returnPath('/cuenta')));
      }
    }));
  }
  $('#link-password-form').hidden = true;
  grid.closest('section').querySelectorAll('h3')[1].hidden = grid.childElementCount === 0;
  $('#arena-link').href = `/${window.location.search}`;
}

async function loadAccount() {
  try {
    return showAccount((await state.client.me()).account);
  } catch (error) {
    if (error.code !== 'user_not_found') throw error;
    // Sesión de Firebase válida pero sin usuario en este entorno: lo registra
    // (email, Google o Apple). Un usuario de TikTok/Twitch/Kick debe volver a entrar.
    try {
      return showAccount((await state.client.registerSession()).account);
    } catch {
      await state.client.logout();
      alertBox('Tu cuenta no existe en este entorno. Entra de nuevo.', 'info');
      return showLogin();
    }
  }
}

function readOAuthReturn() {
  const match = window.location.hash.match(/^#ki-auth=(.+)$/);
  if (!match) return null;
  history.replaceState(null, '', window.location.pathname + window.location.search);
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return { status: 'error', message: 'Respuesta de login inválida.' };
  }
}

function bindForms() {
  const selectTab = register => {
    $('#tab-login').setAttribute('aria-selected', String(!register));
    $('#tab-register').setAttribute('aria-selected', String(register));
    $('#login-form').hidden = register;
    $('#register-form').hidden = !register;
    alertBox('');
  };
  $('#tab-login').addEventListener('click', () => selectTab(false));
  $('#tab-register').addEventListener('click', () => selectTab(true));

  $('#login-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    busy('Elevando tu ki…', async () => showAccount((await state.client.loginWithEmail(form.email.value.trim(), form.password.value)).account));
  });
  $('#register-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    busy('Creando tu guerrero…', async () => {
      const result = await state.client.registerWithEmail(form.email.value.trim(), form.password.value, form.displayName.value.trim());
      showAccount(result.account);
      alertBox('¡Guerrero creado! Te enviamos un email para verificar tu cuenta.', 'ok');
    });
  });
  $('#forgot-password').addEventListener('click', async () => {
    const email = $('#login-form').email.value.trim();
    if (!email) return alertBox('Escribe tu email y vuelve a pulsar «¿Olvidaste tu contraseña?».', 'info');
    try {
      await state.client.resetPassword(email);
      alertBox('Si ese email tiene cuenta, te llegará un enlace para cambiar la contraseña.', 'ok');
    } catch (error) {
      alertBox(describeError(error));
    }
  });
  $('#name-form').addEventListener('submit', event => {
    event.preventDefault();
    const name = event.currentTarget.displayName.value.trim();
    busy('Guardando…', async () => showAccount((await state.client.updateDisplayName(name)).account));
  });
  $('#link-password-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    busy('Vinculando email…', async () => {
      const result = await state.client.linkPassword(form.email.value.trim(), form.password.value);
      showAccount(result.account);
      alertBox('Ahora también puedes entrar con email y contraseña.', 'ok');
    });
  });
  $('#logout').addEventListener('click', () => busy('Saliendo…', async () => {
    await state.client.logout();
    showLogin();
  }));
}

function bindEnvSwitch() {
  const select = $('#env-switch');
  for (const env of APP_ENVIRONMENTS) select.append(new Option(ENVIRONMENT_LABELS[env], env, false, env === state.env));
  select.addEventListener('change', () => {
    const params = new URLSearchParams(window.location.search);
    params.set('env', select.value);
    window.location.search = params.toString();
  });
}

async function start() {
  const { env, error } = resolveAppEnv();
  if (error) {
    loading('');
    $('#env-switch').closest('label').hidden = true;
    return alertBox(`${error} No se puede iniciar sesión.`);
  }
  state.env = env;
  bindEnvSwitch();
  bindForms();
  if (window.location.pathname.replace(/\/$/, '') === '/cuenta') document.title = 'Ki Arena · Mi cuenta';

  state.client = createAuthClient({ env });
  try {
    state.types = (await state.client.listProviderTypes()).providerTypes;
  } catch (err) {
    console.warn(err);
    alertBox('El servidor de login no responde. Puedes ver la pantalla, pero entrar puede fallar.', 'info');
  }

  const oauth = readOAuthReturn();
  if (oauth?.status === 'ok' && oauth.customToken) {
    await busy(`Entrando con ${typeName(oauth.provider)}…`, async () => showAccount((await state.client.finishOAuth(oauth.customToken)).account));
  }

  let first = true;
  state.client.onUser(user => {
    if (state.busy) return;
    if (!user) {
      if (first) loading('');
      first = false;
      return showLogin();
    }
    first = false;
    busy('Leyendo tu scouter…', async () => {
      await loadAccount();
      if (oauth && oauth.status !== 'ok') {
        const builder = LINK_MESSAGES[oauth.status];
        const [message, tone] = builder ? builder(typeName(oauth.provider)) : [oauth.message || 'No se pudo completar.', 'error'];
        alertBox(message, tone);
      }
    });
  });
  if (oauth && oauth.status !== 'ok' && !state.client.auth.currentUser) {
    alertBox(oauth.message || `No se pudo entrar con ${typeName(oauth.provider)}.`, oauth.status === 'cancelled' ? 'info' : 'error');
  }
  setStatus(`Entorno: ${ENVIRONMENT_LABELS[env]}`);
}

start();
