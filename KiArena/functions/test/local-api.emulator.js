// Prueba de integración del authApi local (backend REST) contra el Emulator
// Suite: node test/local-api.emulator.js  (con `npm run emulators` corriendo,
// o `firebase emulators:start --only auth,firestore --project demo-ki-arena`).
// No toca el proyecto real.
import assert from 'node:assert/strict';
import http from 'node:http';
import { createLocalAuthApi } from '../src/local-api.js';
import { createRestAdminFirestore } from '../src/rest-backend.js';

const projectId = 'demo-ki-arena';
const firestoreOrigin = 'http://127.0.0.1:8080';
const authOrigin = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com';
const env = 'dev';
const base = `environments/${env}`;
const db = createRestAdminFirestore({ projectId, apiKey: 'demo-key', origin: firestoreOrigin });

async function signUp(email) {
  const response = await fetch(`${authOrigin}/v1/accounts:signUp?key=demo-key`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'secreto123', returnSecureToken: true })
  });
  const payload = await response.json();
  // El emulador permite marcar el email como verificado.
  await fetch(`${authOrigin}/v1/projects/${projectId}/accounts:update`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ localId: payload.localId, emailVerified: true })
  });
  const again = await fetch(`${authOrigin}/v1/accounts:signInWithPassword?key=demo-key`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'secreto123', returnSecureToken: true })
  });
  return again.json();
}

// KI_TX=0 prueba el modo sin transacciones (como Firestore real con solo la apiKey).
const handler = createLocalAuthApi({ projectId, apiKey: 'demo-key', firestoreOrigin, authOrigin, transactions: process.env.KI_TX !== '0' });
const server = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  await handler(req, res, Buffer.concat(chunks));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const api = `http://127.0.0.1:${server.address().port}/api/auth`;

try {
  const email = `super${Date.now()}@example.com`;
  // Invitación de superadmin antes de que el usuario exista.
  const inviteRef = db.doc(`${base}/kiArenaRoleInvites/${email}:superadmin`);
  await inviteRef.set({ id: inviteRef.id, reference: inviteRef, isActive: true, email, roleRef: db.doc(`${base}/kiArenaRoles/superadmin`), createdAt: new Date().toISOString() });

  const providers = await (await fetch(`${api}/providers?env=${env}`)).json();
  assert.ok(providers.providerTypes.some(t => t.code === 'google'));

  const user = await signUp(email);
  const session = await fetch(`${api}/session`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.idToken}` },
    body: JSON.stringify({ env, mode: 'login' })
  });
  const body = await session.json();
  assert.equal(session.status, 200, JSON.stringify(body));
  assert.equal(session.headers.get('x-ki-arena-auth'), 'local');
  assert.equal(body.account.user.email, email);
  assert.deepEqual(body.account.user.roleIds.sort(), ['player', 'superadmin']);

  const invite = (await inviteRef.get()).data();
  assert.equal(invite.isActive, false);
  assert.equal(invite.usedByRef.id, user.localId);
  const row = (await db.doc(`${base}/kiArenaUserRoles/${user.localId}:superadmin`).get()).data();
  assert.equal(row.isActive, true);
  assert.equal(row.source, 'invite');

  const me = await (await fetch(`${api}/me?env=${env}`, { headers: { Authorization: `Bearer ${user.idToken}` } })).json();
  assert.equal(me.account.links.length, 1);

  const bad = await fetch(`${api}/me?env=${env}`, { headers: { Authorization: 'Bearer x.eyJhdWQiOiJkZW1vLWtpLWFyZW5hIiwiZXhwIjo5OTk5OTk5OTk5fQ.y' } });
  assert.equal(bad.status, 401);
  console.log('authApi local contra emuladores: OK');
} finally {
  server.close();
}
