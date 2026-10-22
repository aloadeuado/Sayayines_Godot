// API de autenticación de Ki Arena, servida en /api/auth/** por Firebase Hosting.
//   GET  /providers?env=             catálogo visible en la pantalla de login
//   POST /session      (Bearer)      registra el login con email, Google o Apple, o un vínculo nativo
//   GET  /me?env=      (Bearer)      usuario y cuentas vinculadas
//   POST /profile      (Bearer)      cambia el nombre visible
//   POST /oauth/start  (Bearer en vínculos) URL de autorización de TikTok, Twitch o Kick
//   GET  /oauth/callback/:provider   recibe el código, resuelve el usuario y vuelve a la web
//   POST /unlink       (Bearer)      desvincula una cuenta (nunca la última)
import { createAccounts, AccountError } from './accounts.js';
import { FIREBASE_PROVIDER_TO_TYPE } from './catalog.js';
import { parseEnvironment, ENVIRONMENTS, collectionPath } from './environment.js';
import { OAUTH_PROVIDERS, randomToken, pkceChallenge } from './oauth-providers.js';

const STATE_TTL_MS = 10 * 60 * 1000;
const TYPE_TO_FIREBASE_PROVIDER = Object.fromEntries(Object.entries(FIREBASE_PROVIDER_TO_TYPE).map(([k, v]) => [v, k]));

function safeReturnPath(value, fallback = '/login') {
  const path = String(value || '');
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('\\') ? path.slice(0, 300) : fallback;
}

export function createAuthApi({ db, auth, secrets = {}, fetchImpl = fetch, now = () => Date.now() }) {
  const accountsFor = env => createAccounts({ db, env, now: () => new Date(now()).toISOString() });

  async function requireUser(req) {
    const header = String(req.headers?.authorization || '');
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) throw new AccountError('unauthenticated', 'Inicia sesión primero.', 401);
    try {
      return await auth.verifyIdToken(token);
    } catch {
      throw new AccountError('unauthenticated', 'La sesión expiró. Vuelve a entrar.', 401);
    }
  }

  async function nativeProfile(uid, firebaseProviderId) {
    const record = await auth.getUser(uid);
    const info = (record.providerData || []).find(p => p.providerId === firebaseProviderId);
    if (!info) throw new AccountError('provider_missing', 'Firebase no tiene ese proveedor en tu sesión.');
    const typeId = FIREBASE_PROVIDER_TO_TYPE[firebaseProviderId];
    const email = info.email || record.email || undefined;
    // Email y contraseña: la llave es el uid de Firebase, que no cambia si cambia el email.
    const providerUserId = typeId === 'password' ? record.uid : info.uid;
    return {
      providerTypeId: typeId,
      providerUserId,
      displayName: info.displayName || record.displayName || undefined,
      avatarUrl: info.photoURL || record.photoURL || undefined,
      email,
      emailVerified: typeId === 'google' ? true : record.emailVerified === true,
      isPrivateEmail: typeId === 'apple' && email ? /@privaterelay\.appleid\.com$/i.test(email) : undefined
    };
  }

  async function assertTypeEnabled(accounts, code, purpose) {
    const type = await accounts.getProviderType(code);
    const allowed = purpose === 'link' ? type?.allowLink !== false : type?.allowLogin !== false;
    if (!type || type.isActive === false || !allowed) {
      throw new AccountError('provider_disabled', `${type?.name || code} no está habilitado en este entorno.`, 403);
    }
    return type;
  }

  const routes = {
    'GET /providers': async req => {
      const env = parseEnvironment(req.query?.env);
      return { env, providerTypes: await accountsFor(env).listProviderTypes() };
    },

    'POST /session': async req => {
      const decoded = await requireUser(req);
      const env = parseEnvironment(req.body?.env);
      const accounts = accountsFor(env);
      const mode = req.body?.mode === 'link' ? 'link' : 'login';
      const signInProvider = decoded.firebase?.sign_in_provider;

      if (mode === 'login' && signInProvider === 'custom') {
        const account = await accounts.getAccount(decoded.uid);
        if (!account) throw new AccountError('user_not_found', 'Tu usuario no existe en este entorno.', 404);
        await db.doc(`${collectionPath(env, 'users')}/${decoded.uid}`).set({ lastLoginAt: new Date(now()).toISOString() }, { merge: true });
        return { status: 'ok', account };
      }

      const typeId = mode === 'link' ? String(req.body?.providerTypeId || '') : FIREBASE_PROVIDER_TO_TYPE[signInProvider];
      const firebaseProviderId = TYPE_TO_FIREBASE_PROVIDER[typeId];
      if (!firebaseProviderId) throw new AccountError('provider_unsupported', 'Proveedor no soportado en esta ruta.');
      await assertTypeEnabled(accounts, typeId, mode);
      const profile = await nativeProfile(decoded.uid, firebaseProviderId);
      if (req.body?.appleName && typeId === 'apple') {
        profile.firstName = String(req.body.appleName.firstName || '').slice(0, 60) || undefined;
        profile.lastName = String(req.body.appleName.lastName || '').slice(0, 60) || undefined;
      }

      if (mode === 'link') {
        const result = await accounts.link({ profile, userId: decoded.uid });
        return { ...result, account: await accounts.getAccount(decoded.uid) };
      }
      const seed = { displayName: String(req.body?.displayName || '').trim().slice(0, 40) || undefined };
      const result = await accounts.signIn({ profile, preferredUid: decoded.uid, seed });
      if (result.userId !== decoded.uid) {
        throw new AccountError('uid_mismatch', 'Esta cuenta está ligada a otro usuario. Entra con ese usuario.', 409);
      }
      return { ...result, account: await accounts.getAccount(decoded.uid) };
    },

    'GET /me': async req => {
      const decoded = await requireUser(req);
      const env = parseEnvironment(req.query?.env);
      const account = await accountsFor(env).getAccount(decoded.uid);
      if (!account) throw new AccountError('user_not_found', 'Tu usuario no existe en este entorno.', 404);
      return { account };
    },

    'POST /profile': async req => {
      const decoded = await requireUser(req);
      const env = parseEnvironment(req.body?.env);
      const accounts = accountsFor(env);
      await accounts.updateProfile(decoded.uid, { displayName: req.body?.displayName });
      return { account: await accounts.getAccount(decoded.uid) };
    },

    'POST /oauth/start': async req => {
      const env = parseEnvironment(req.body?.env);
      const accounts = accountsFor(env);
      const provider = String(req.body?.provider || '');
      const adapter = OAUTH_PROVIDERS[provider];
      if (!adapter) throw new AccountError('provider_unsupported', 'Proveedor no soportado.');
      const mode = req.body?.mode === 'link' ? 'link' : 'login';
      const decoded = mode === 'link' ? await requireUser(req) : null;
      const type = await assertTypeEnabled(accounts, provider, mode);
      if (!type.clientId || !type.redirectUri) {
        throw new AccountError('provider_not_configured', `${type.name} aún no tiene clientId y redirectUri en ${env}.`, 503);
      }
      const state = `${env}.${randomToken(24)}`;
      const codeVerifier = adapter.usesPkce ? randomToken(48) : undefined;
      const createdAt = new Date(now()).toISOString();
      const stateRef = db.doc(`${collectionPath(env, 'oauthStates')}/${state}`);
      await stateRef.set(Object.fromEntries(Object.entries({
        id: state,
        reference: stateRef,
        isActive: true,
        provider,
        mode,
        userRef: decoded ? accounts.refs.user(decoded.uid) : undefined,
        codeVerifier,
        returnTo: safeReturnPath(req.body?.returnTo),
        createdAt,
        expiresAt: new Date(now() + STATE_TTL_MS).toISOString()
      }).filter(([, v]) => v !== undefined)));
      const scopes = Array.isArray(type.scopes) ? type.scopes : [];
      const url = adapter.authorizeUrl({
        clientId: type.clientId, redirectUri: type.redirectUri, scopes, state,
        codeChallenge: codeVerifier ? pkceChallenge(codeVerifier) : undefined
      });
      return { url };
    },

    'GET /oauth/callback': async (req, provider) => {
      const state = String(req.query?.state || '');
      const env = parseEnvironment(state.split('.')[0]);
      const accounts = accountsFor(env);
      const stateRef = db.doc(`${collectionPath(env, 'oauthStates')}/${state.replace(/\//g, '')}`);
      // El estado se consume una sola vez (borrado suave).
      const saved = await db.runTransaction(async tx => {
        const snap = await tx.get(stateRef);
        const data = snap.exists ? snap.data() : null;
        if (!data || data.isActive === false || data.provider !== provider || Date.parse(data.expiresAt) < now()) return null;
        tx.set(stateRef, { isActive: false, codeVerifier: null, usedAt: new Date(now()).toISOString() }, { merge: true });
        return data;
      });
      if (!saved) throw new AccountError('invalid_state', 'El intento de login expiró. Vuelve a intentarlo.');
      const returnTo = safeReturnPath(saved.returnTo);
      const redirect = payload => ({ redirect: `${returnTo}#ki-auth=${encodeURIComponent(JSON.stringify({ env, provider, ...payload }))}` });
      if (req.query?.error) return redirect({ status: 'cancelled', message: String(req.query.error_description || req.query.error).slice(0, 200) });

      const type = await accounts.getProviderType(provider);
      const clientSecret = secrets[provider]?.();
      if (!clientSecret) return redirect({ status: 'error', message: `Falta el secreto de ${type?.name || provider}.` });
      const profile = await OAUTH_PROVIDERS[provider].fetchProfile({
        code: String(req.query?.code || ''), clientId: type.clientId, clientSecret, redirectUri: type.redirectUri,
        codeVerifier: saved.codeVerifier, fetchImpl
      });

      if (saved.mode === 'link') {
        const result = await accounts.link({ profile, userId: saved.userRef.id });
        return redirect({ status: result.status });
      }
      const result = await accounts.signIn({ profile });
      const customToken = await auth.createCustomToken(result.userId);
      return redirect({ status: 'ok', created: result.created, customToken });
    },

    'POST /unlink': async req => {
      const decoded = await requireUser(req);
      const env = parseEnvironment(req.body?.env);
      const accounts = accountsFor(env);
      const result = await accounts.unlink({ userId: decoded.uid, userProviderId: String(req.body?.userProviderId || '') });
      const firebaseProviderId = TYPE_TO_FIREBASE_PROVIDER[result.providerTypeId];
      if (result.status === 'unlinked' && firebaseProviderId) {
        await auth.updateUser(decoded.uid, { providersToUnlink: [firebaseProviderId] }).catch(error => {
          console.warn('No se pudo desvincular en Firebase Auth', error.message);
        });
      }
      return { ...result, account: await accounts.getAccount(decoded.uid) };
    }
  };

  return async function handle(req, res) {
    const path = String(req.path || req.url || '').split('?')[0].replace(/^\/api\/auth/, '').replace(/\/$/, '') || '/';
    const callback = path.match(/^\/oauth\/callback\/([a-z]+)$/);
    const key = callback ? 'GET /oauth/callback' : `${req.method} ${path}`;
    const route = routes[key];
    res.set('Cache-Control', 'no-store');
    if (!route) return res.status(404).json({ error: 'not_found' });
    try {
      const result = await route(req, callback?.[1]);
      if (result?.redirect) return res.redirect(302, result.redirect);
      return res.status(200).json(result);
    } catch (error) {
      const status = error.status || 500;
      if (status >= 500) console.error('authApi', key, error);
      if (callback) {
        const message = encodeURIComponent(JSON.stringify({ status: 'error', provider: callback[1], message: error.status ? error.message : 'No se pudo completar el login.' }));
        return res.redirect(302, `/login#ki-auth=${message}`);
      }
      return res.status(status).json({ error: error.code || 'internal', message: error.status ? error.message : 'Error interno.' });
    }
  };
}

export { ENVIRONMENTS };
