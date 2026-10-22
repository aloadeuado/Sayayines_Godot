// Cliente de autenticación: Firebase Auth en el navegador + API /api/auth en
// Cloud Functions. El navegador nunca escribe usuarios ni vínculos en Firestore;
// eso lo hace el servidor.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth, connectAuthEmulator, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendEmailVerification, sendPasswordResetEmail, updateProfile, signInWithPopup, linkWithPopup,
  linkWithCredential, EmailAuthProvider, GoogleAuthProvider, OAuthProvider, signInWithCustomToken, signOut
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

const FIREBASE_WEB_CONFIG = Object.freeze({
  apiKey: 'AIzaSyCC4-wbqtXjfaQ2Y0z8nMg5pAuowEXLxbA',
  authDomain: 'sayayin-c0dfe.firebaseapp.com',
  projectId: 'sayayin-c0dfe',
  appId: '1:40160495788:web:fa559d5cef9b2d0c69f709'
});

const AUTH_ERRORS = {
  'auth/invalid-credential': 'Email o contraseña incorrectos.',
  'auth/wrong-password': 'Email o contraseña incorrectos.',
  'auth/user-not-found': 'No hay un guerrero con ese email.',
  'auth/email-already-in-use': 'Ese email ya tiene una cuenta. Entra con él.',
  'auth/weak-password': 'La contraseña necesita al menos 6 caracteres.',
  'auth/invalid-email': 'Ese email no es válido.',
  'auth/popup-closed-by-user': 'Cerraste la ventana antes de terminar.',
  'auth/cancelled-popup-request': 'Cerraste la ventana antes de terminar.',
  'auth/popup-blocked': 'El navegador bloqueó la ventana. Permite ventanas emergentes.',
  'auth/credential-already-in-use': 'Esa cuenta ya está vinculada a otro guerrero de Ki Arena.',
  'auth/account-exists-with-different-credential': 'Ese email ya entra con otro método. Entra con ese y vincula desde tu cuenta.',
  'auth/provider-already-linked': 'Esa cuenta ya está vinculada.',
  'auth/operation-not-allowed': 'Este método no está activado en Firebase Authentication.',
  'auth/too-many-requests': 'Demasiados intentos. Espera un momento.',
  'auth/network-request-failed': 'Sin conexión con Firebase.'
};

export function describeError(error) {
  return AUTH_ERRORS[error?.code] || error?.message || 'Algo salió mal.';
}

function nativeProvider(code) {
  if (code === 'google') {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return provider;
  }
  if (code === 'apple') {
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    return provider;
  }
  throw new Error(`Proveedor nativo desconocido: ${code}`);
}

// Proyecto de prueba del Emulator Suite: nunca toca el proyecto real.
const EMULATOR_WEB_CONFIG = Object.freeze({ apiKey: 'demo-key', authDomain: 'demo-ki-arena.firebaseapp.com', projectId: 'demo-ki-arena' });

export function createAuthClient({ env, emulator = false, apiBase = '/api/auth' }) {
  const app = initializeApp(emulator ? EMULATOR_WEB_CONFIG : FIREBASE_WEB_CONFIG);
  const auth = getAuth(app);
  if (emulator) connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  auth.languageCode = 'es';

  async function api(path, { method = 'GET', body, authenticated = true } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (authenticated && auth.currentUser) headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
    const query = method === 'GET' ? `${path.includes('?') ? '&' : '?'}env=${encodeURIComponent(env)}` : '';
    const response = await fetch(`${apiBase}${path}${query}`, {
      method, headers, body: method === 'GET' ? undefined : JSON.stringify({ env, ...body })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.message || `Error ${response.status} del servidor de login.`);
      error.code = payload.error;
      throw error;
    }
    return payload;
  }

  const registerSession = (body = {}) => api('/session', { method: 'POST', body: { mode: 'login', ...body } });

  return {
    auth,
    onUser: callback => onAuthStateChanged(auth, callback),
    listProviderTypes: () => api('/providers', { authenticated: false }),
    me: () => api('/me'),
    registerSession: () => registerSession(),
    updateDisplayName: displayName => api('/profile', { method: 'POST', body: { displayName } }),

    async loginWithEmail(email, password) {
      await signInWithEmailAndPassword(auth, email, password);
      return registerSession();
    },
    async registerWithEmail(email, password, displayName) {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) await updateProfile(user, { displayName });
      sendEmailVerification(user).catch(() => {});
      return registerSession({ displayName });
    },
    resetPassword: email => sendPasswordResetEmail(auth, email),

    async loginWithNative(code) {
      await signInWithPopup(auth, nativeProvider(code));
      return registerSession();
    },
    async startOAuth(provider, mode, returnTo) {
      const { url } = await api('/oauth/start', { method: 'POST', body: { provider, mode, returnTo }, authenticated: mode === 'link' });
      window.location.assign(url);
    },
    async finishOAuth(customToken) {
      await signInWithCustomToken(auth, customToken);
      return registerSession();
    },

    async linkNative(code) {
      await linkWithPopup(auth.currentUser, nativeProvider(code));
      return api('/session', { method: 'POST', body: { mode: 'link', providerTypeId: code } });
    },
    async linkPassword(email, password) {
      await linkWithCredential(auth.currentUser, EmailAuthProvider.credential(email, password));
      return api('/session', { method: 'POST', body: { mode: 'link', providerTypeId: 'password' } });
    },
    async unlink(userProviderId) {
      const result = await api('/unlink', { method: 'POST', body: { userProviderId } });
      await auth.currentUser?.reload().catch(() => {});
      return result;
    },
    logout: () => signOut(auth)
  };
}
