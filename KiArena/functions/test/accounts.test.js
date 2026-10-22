import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FakeFirestore } from './fake-firestore.js';
import { createAccounts } from '../src/accounts.js';
import { parseEnvironment, providerDocId } from '../src/environment.js';

const ENV = 'qa';
const base = `environments/${ENV}`;
const google = { providerTypeId: 'google', providerUserId: '109876543210987654321', displayName: 'Pedro Bem', email: 'pedro@example.com', emailVerified: true };
const twitch = { providerTypeId: 'twitch', providerUserId: '141981764', username: 'pedrodbz', displayName: 'PedroDBZ' };
const kick = { providerTypeId: 'kick', providerUserId: '4567890', username: 'pedrodbz' };

function setup() {
  const db = new FakeFirestore();
  let tick = 0;
  const accounts = createAccounts({ db, env: ENV, now: () => new Date(Date.UTC(2026, 9, 22, 18, 0, tick++)).toISOString() });
  return { db, accounts };
}

const events = db => db.list(`${base}/kiArenaUserProviderEvents/`).map(e => e.action);

test('solo acepta dev, qa y prd', () => {
  assert.equal(parseEnvironment('qa'), 'qa');
  assert.throws(() => parseEnvironment('prod'), /dev, qa o prd/);
  assert.equal(providerDocId('tiktok', 'a/b'), 'tiktok:a%2Fb');
});

test('primer login con Google crea usuario, proveedor y vínculo con referencias completas', async () => {
  const { db, accounts } = setup();
  const result = await accounts.signIn({ profile: google, preferredUid: 'Xk3f', seed: { displayName: 'Pedro' } });
  assert.deepEqual(result, { status: 'ok', created: true, userId: 'Xk3f' });

  const user = db.read(`${base}/kiArenaUsers/Xk3f`);
  assert.equal(user.isActive, true);
  assert.equal(user.displayName, 'Pedro');
  assert.equal(user.reference.path, `${base}/kiArenaUsers/Xk3f`);
  assert.deepEqual(user.userProviderRefs.map(r => r.path), [`${base}/kiArenaUserProviders/Xk3f:google:109876543210987654321`]);
  assert.equal(user.primaryUserProviderRef.path, user.userProviderRefs[0].path);
  assert.deepEqual(user.providerTypeRefs.map(r => r.path), [`${base}/kiArenaProviderTypes/google`]);

  const provider = db.read(`${base}/kiArenaProviders/google:109876543210987654321`);
  assert.equal(provider.reference.path, `${base}/kiArenaProviders/google:109876543210987654321`);
  assert.equal(provider.providerTypeRef.path, `${base}/kiArenaProviderTypes/google`);
  assert.equal(provider.isActive, true);

  const link = db.read(`${base}/kiArenaUserProviders/Xk3f:google:109876543210987654321`);
  assert.equal(link.userRef.path, `${base}/kiArenaUsers/Xk3f`);
  assert.equal(link.providerRef.path, provider.reference.path);
  assert.equal(link.isPrimary, true);
  assert.deepEqual(events(db), ['link']);
});

test('entrar otra vez o con una cuenta vinculada lleva al mismo usuario', async () => {
  const { db, accounts } = setup();
  await accounts.signIn({ profile: google, preferredUid: 'Xk3f' });
  assert.equal((await accounts.signIn({ profile: google, preferredUid: 'Xk3f' })).created, false);
  assert.equal((await accounts.link({ profile: twitch, userId: 'Xk3f' })).status, 'linked');
  const viaTwitch = await accounts.signIn({ profile: twitch });
  assert.deepEqual(viaTwitch, { status: 'ok', created: false, userId: 'Xk3f' });
  assert.equal(db.read(`${base}/kiArenaUsers/Xk3f`).userProviderRefs.length, 2);
  assert.equal(db.list(`${base}/kiArenaUsers/`).length, 1);
});

test('una cuenta externa no se mueve a otro usuario: queda un evento conflict', async () => {
  const { db, accounts } = setup();
  await accounts.signIn({ profile: google, preferredUid: 'Xk3f' });
  await accounts.link({ profile: twitch, userId: 'Xk3f' });
  await accounts.signIn({ profile: kick, preferredUid: 'Ab12' });
  const result = await accounts.link({ profile: twitch, userId: 'Ab12' });
  assert.equal(result.status, 'conflict');
  const conflict = db.list(`${base}/kiArenaUserProviderEvents/`).find(e => e.action === 'conflict');
  assert.equal(conflict.userRef.path, `${base}/kiArenaUsers/Ab12`);
  assert.equal(conflict.otherUserRef.path, `${base}/kiArenaUsers/Xk3f`);
  assert.equal(db.read(`${base}/kiArenaUserProviders/Ab12:twitch:141981764`), undefined);
  assert.equal((await accounts.link({ profile: twitch, userId: 'Xk3f' })).status, 'already_linked');
});

test('desvincular es borrado suave, cambia el principal y nunca quita el último', async () => {
  const { db, accounts } = setup();
  await accounts.signIn({ profile: google, preferredUid: 'Xk3f' });
  await accounts.link({ profile: twitch, userId: 'Xk3f' });
  await accounts.link({ profile: kick, userId: 'Xk3f' });

  const googleLink = 'Xk3f:google:109876543210987654321';
  assert.equal((await accounts.unlink({ userId: 'Xk3f', userProviderId: googleLink })).providerTypeId, 'google');
  const removed = db.read(`${base}/kiArenaUserProviders/${googleLink}`);
  assert.equal(removed.isActive, false);
  assert.ok(removed.unlinkedAt);
  const user = db.read(`${base}/kiArenaUsers/Xk3f`);
  assert.equal(user.primaryUserProviderRef.path, `${base}/kiArenaUserProviders/Xk3f:twitch:141981764`);
  assert.equal(db.read(`${base}/kiArenaUserProviders/Xk3f:twitch:141981764`).isPrimary, true);
  assert.deepEqual(user.providerTypeRefs.map(r => r.id).sort(), ['kick', 'twitch']);
  assert.ok(db.read(`${base}/kiArenaProviders/google:109876543210987654321`), 'el proveedor sigue guardado');

  await accounts.unlink({ userId: 'Xk3f', userProviderId: 'Xk3f:kick:4567890' });
  await assert.rejects(accounts.unlink({ userId: 'Xk3f', userProviderId: 'Xk3f:twitch:141981764' }), { code: 'last_link' });
  await assert.rejects(accounts.unlink({ userId: 'Ab12', userProviderId: 'Xk3f:twitch:141981764' }), { code: 'link_not_found' });

  assert.equal((await accounts.link({ profile: kick, userId: 'Xk3f' })).status, 'linked');
  assert.deepEqual(events(db), ['link', 'link', 'link', 'unlink', 'unlink', 'relink']);
});

test('una cuenta desvinculada puede entrar de nuevo y crea un usuario nuevo', async () => {
  const { db, accounts } = setup();
  await accounts.signIn({ profile: google, preferredUid: 'Xk3f' });
  await accounts.link({ profile: twitch, userId: 'Xk3f' });
  await accounts.unlink({ userId: 'Xk3f', userProviderId: 'Xk3f:twitch:141981764' });
  const result = await accounts.signIn({ profile: twitch });
  assert.equal(result.created, true);
  assert.notEqual(result.userId, 'Xk3f');
  assert.equal(db.list(`${base}/kiArenaUsers/`).length, 2);
});

test('un usuario desactivado no puede entrar', async () => {
  const { db, accounts } = setup();
  await accounts.signIn({ profile: google, preferredUid: 'Xk3f' });
  db.write(`${base}/kiArenaUsers/Xk3f`, { isActive: false }, { merge: true });
  await assert.rejects(accounts.signIn({ profile: google, preferredUid: 'Xk3f' }), { code: 'user_inactive' });
});

test('getAccount devuelve el usuario y sus cuentas activas', async () => {
  const { accounts } = setup();
  await accounts.signIn({ profile: google, preferredUid: 'Xk3f' });
  await accounts.link({ profile: twitch, userId: 'Xk3f' });
  const account = await accounts.getAccount('Xk3f');
  assert.equal(account.user.displayName, 'Pedro Bem');
  assert.deepEqual(account.links.map(l => [l.providerTypeId, l.isPrimary]), [['google', true], ['twitch', false]]);
});

test('el usuario de email y contraseña guarda su email aunque falte verificarlo', async () => {
  const { db, accounts } = setup();
  const password = { providerTypeId: 'password', providerUserId: 'U1', email: 'goku@kiarena.test', emailVerified: false };
  await accounts.signIn({ profile: password, preferredUid: 'U1', seed: { displayName: 'Goku' } });
  const user = db.read(`${base}/kiArenaUsers/U1`);
  assert.equal(user.email, 'goku@kiarena.test');
  assert.equal(user.emailVerified, false);
  // Un email sin verificar de otro proveedor no se toma como contacto.
  await accounts.signIn({ profile: { ...twitch, email: 'otro@twitch.test', emailVerified: false } });
  const other = db.list(`${base}/kiArenaUsers/`).find(u => u.id !== 'U1');
  assert.equal(other.email, undefined);
});
