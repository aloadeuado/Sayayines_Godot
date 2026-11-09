import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FakeFirestore } from './fake-firestore.js';
import { createAuthApi } from '../src/auth-api.js';
import { pkceChallenge } from '../src/oauth-providers.js';

const base = 'environments/dev';

function fakeAuth(users = {}) {
  return {
    async verifyIdToken(token) {
      const user = users[token];
      if (!user) throw new Error('bad token');
      return { uid: user.uid, firebase: { sign_in_provider: user.signInProvider } };
    },
    async getUser(uid) {
      return Object.values(users).find(u => u.uid === uid).record;
    },
    async createCustomToken(uid) {
      return `custom-${uid}`;
    },
    unlinked: [],
    async updateUser(uid, change) {
      this.unlinked.push([uid, ...change.providersToUnlink]);
    }
  };
}

function call(handler, { method = 'GET', path, query = {}, body = {}, token }) {
  return new Promise(resolve => {
    const res = {
      statusCode: 200, headers: {},
      set(k, v) { this.headers[k] = v; return this; },
      status(code) { this.statusCode = code; return this; },
      json(payload) { resolve({ status: this.statusCode, body: payload }); },
      redirect(code, location) { resolve({ status: code, location }); }
    };
    handler({ method, path, query, body, headers: token ? { authorization: `Bearer ${token}` } : {} }, res);
  });
}

const kickFetch = calls => async (url, options = {}) => {
  calls.push([url, options.body ? Object.fromEntries(new URLSearchParams(options.body)) : null]);
  if (url === 'https://id.kick.com/oauth/token') return new Response(JSON.stringify({ access_token: 'at', scope: 'user:read' }));
  if (url === 'https://api.kick.com/public/v1/users') {
    return new Response(JSON.stringify({ data: [{ user_id: 4567890, name: 'pedrodbz', email: 'pedro@example.com', profile_picture: 'https://files.kick.com/p.png' }] }));
  }
  return new Response('{}', { status: 404 });
};

function seedKick(db) {
  db.write(`${base}/kiArenaProviderTypes/kick`, {
    id: 'kick', isActive: true, clientId: 'kick-client', redirectUri: 'https://example.com/api/auth/oauth/callback/kick', scopes: ['user:read']
  });
}

test('login con email registra el usuario con la llave uid de Firebase', async () => {
  const db = new FakeFirestore();
  const auth = fakeAuth({ t1: { uid: 'U1', signInProvider: 'password', record: { uid: 'U1', email: 'a@b.co', emailVerified: false, providerData: [{ providerId: 'password', uid: 'a@b.co', email: 'a@b.co' }] } } });
  const handler = createAuthApi({ db, auth });
  const res = await call(handler, { method: 'POST', path: '/api/auth/session', token: 't1', body: { env: 'dev', displayName: 'Goku' } });
  assert.equal(res.status, 200);
  assert.equal(res.body.account.user.displayName, 'Goku');
  assert.ok(db.read(`${base}/kiArenaProviders/password:U1`));
  const unauth = await call(handler, { method: 'POST', path: '/api/auth/session', body: { env: 'dev' } });
  assert.equal(unauth.status, 401);
  const badEnv = await call(handler, { method: 'POST', path: '/api/auth/session', token: 't1', body: { env: 'prod' } });
  assert.equal(badEnv.status, 400);
});

test('Kick: PKCE, state de un solo uso y custom token del usuario', async () => {
  const db = new FakeFirestore();
  seedKick(db);
  const calls = [];
  const handler = createAuthApi({ db, auth: fakeAuth(), secrets: { kick: () => 'kick-secret' }, fetchImpl: kickFetch(calls) });

  const start = await call(handler, { method: 'POST', path: '/api/auth/oauth/start', body: { env: 'dev', provider: 'kick', returnTo: '/login' } });
  assert.equal(start.status, 200);
  const authorize = new URL(start.body.url);
  assert.equal(authorize.origin + authorize.pathname, 'https://id.kick.com/oauth/authorize');
  const state = authorize.searchParams.get('state');
  assert.ok(state.startsWith('dev.'));
  const saved = db.read(`${base}/kiArenaOAuthStates/${state}`);
  assert.equal(authorize.searchParams.get('code_challenge'), pkceChallenge(saved.codeVerifier));

  const callback = await call(handler, { path: '/api/auth/oauth/callback/kick', query: { code: 'abc', state } });
  assert.equal(callback.status, 302);
  const payload = JSON.parse(decodeURIComponent(callback.location.split('#ki-auth=')[1]));
  assert.equal(payload.status, 'ok');
  assert.match(payload.customToken, /^custom-/);
  assert.equal(calls[0][1].code_verifier, saved.codeVerifier);
  assert.equal(calls[0][1].client_secret, 'kick-secret');
  assert.ok(db.read(`${base}/kiArenaProviders/kick:4567890`));
  assert.equal(db.read(`${base}/kiArenaOAuthStates/${state}`).isActive, false);

  const replay = await call(handler, { path: '/api/auth/oauth/callback/kick', query: { code: 'abc', state } });
  assert.match(decodeURIComponent(replay.location), /"status":"error"/);
});

test('un proveedor sin clientId responde que falta configurarlo', async () => {
  const handler = createAuthApi({ db: new FakeFirestore(), auth: fakeAuth() });
  const res = await call(handler, { method: 'POST', path: '/api/auth/oauth/start', body: { env: 'dev', provider: 'twitch' } });
  assert.equal(res.status, 503);
  assert.equal(res.body.error, 'provider_not_configured');
});

test('returnTo externo se ignora', async () => {
  const db = new FakeFirestore();
  seedKick(db);
  const handler = createAuthApi({ db, auth: fakeAuth() });
  const start = await call(handler, { method: 'POST', path: '/api/auth/oauth/start', body: { env: 'dev', provider: 'kick', returnTo: '//evil.example' } });
  const state = new URL(start.body.url).searchParams.get('state');
  assert.equal(db.read(`${base}/kiArenaOAuthStates/${state}`).returnTo, '/login');
});

test('desvincular Google también lo quita de Firebase Auth', async () => {
  const db = new FakeFirestore();
  const record = { uid: 'U1', email: 'p@x.co', emailVerified: true, providerData: [{ providerId: 'google.com', uid: 'g1', email: 'p@x.co' }, { providerId: 'password', uid: 'p@x.co' }] };
  const auth = fakeAuth({ g: { uid: 'U1', signInProvider: 'google.com', record } });
  const handler = createAuthApi({ db, auth });
  await call(handler, { method: 'POST', path: '/api/auth/session', token: 'g', body: { env: 'dev' } });
  const linked = await call(handler, { method: 'POST', path: '/api/auth/session', token: 'g', body: { env: 'dev', mode: 'link', providerTypeId: 'password' } });
  assert.equal(linked.body.status, 'linked');
  const res = await call(handler, { method: 'POST', path: '/api/auth/unlink', token: 'g', body: { env: 'dev', userProviderId: 'U1:google:g1' } });
  assert.equal(res.body.status, 'unlinked');
  assert.deepEqual(auth.unlinked, [['U1', 'google.com']]);
  const last = await call(handler, { method: 'POST', path: '/api/auth/unlink', token: 'g', body: { env: 'dev', userProviderId: 'U1:password:U1' } });
  assert.equal(last.status, 409);
});
