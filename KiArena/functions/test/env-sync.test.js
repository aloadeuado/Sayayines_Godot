import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planCollection, rewriteValue, syncEnvironments, assertSyncPair } from '../../public/src/services/firebase/env-sync.js';

const ROOT = 'projects/p/databases/(default)/documents';
const ref = (env, path) => ({ referenceValue: `${ROOT}/environments/${env}/${path}` });
const s = v => ({ stringValue: v });

test('reescribe referencias anidadas al ambiente destino', () => {
  const value = { mapValue: { fields: { a: ref('dev', 'kiArenaRaces/saiyajin'), list: { arrayValue: { values: [ref('dev', 'kiArenaRoles/admin')] } } } } };
  const out = rewriteValue(value, 'dev', 'qa');
  assert.equal(out.mapValue.fields.a.referenceValue, `${ROOT}/environments/qa/kiArenaRaces/saiyajin`);
  assert.equal(out.mapValue.fields.list.arrayValue.values[0].referenceValue, `${ROOT}/environments/qa/kiArenaRoles/admin`);
});

test('el plan separa crear, actualizar, iguales y solo en destino; ignora campos excluidos', () => {
  const sourceDocs = {
    player: { name: s('Jugador'), level: { integerValue: '10' }, clientId: s('dev-id') },
    admin: { name: s('Administrador'), level: { integerValue: '80' } },
    seller: { name: s('Vendedor') }
  };
  const targetDocs = {
    player: { name: s('Jugador'), level: { doubleValue: 10 }, clientId: s('qa-id'), updatedAt: s('x') },
    admin: { name: s('Admin viejo'), level: { integerValue: '80' } },
    legacy: { name: s('Viejo') }
  };
  const plan = planCollection({ sourceDocs, targetDocs, from: 'dev', to: 'qa', excludeFields: ['clientId'] });
  assert.deepEqual(plan.items.map(i => [i.id, i.action]), [['admin', 'update'], ['player', 'same'], ['seller', 'create']]);
  assert.deepEqual(plan.items[0].changedFields, ['name']);
  assert.equal('clientId' in plan.items[1].fields, false);
  assert.deepEqual(plan.targetOnly, ['legacy']);
});

test('prd exige confirmación y origen distinto de destino', () => {
  assert.throws(() => assertSyncPair('qa', 'prd', { apply: true }), /prd/);
  assert.doesNotThrow(() => assertSyncPair('qa', 'prd', { apply: false }));
  assert.throws(() => assertSyncPair('dev', 'dev'), /distintos/);
  assert.throws(() => assertSyncPair('dev', 'prod'), /dev, qa o prd/);
});

test('apply escribe solo lo que cambia, con referencia propia del destino y sin borrar', async () => {
  const store = {
    dev: { kiArenaRoles: { player: { id: s('player'), reference: ref('dev', 'kiArenaRoles/player'), name: s('Jugador') }, admin: { id: s('admin'), name: s('Administrador') } } },
    qa: { kiArenaRoles: { player: { id: s('player'), reference: ref('qa', 'kiArenaRoles/player'), name: s('Jugador') }, old: { name: s('Viejo') } } }
  };
  const writes = [];
  const client = {
    root: ROOT,
    list: async (env, col) => structuredClone(store[env][col] || {}),
    write: async (env, col, id, fields) => { writes.push([env, col, id]); store[env][col][id] = { ...(store[env][col][id] || {}), ...fields }; }
  };
  const [result] = await syncEnvironments({ client, from: 'dev', to: 'qa', keys: ['roles'], apply: true, now: () => 'T' });
  assert.deepEqual(writes, [['qa', 'kiArenaRoles', 'admin']]);
  assert.equal(result.written, 1);
  assert.equal(store.qa.kiArenaRoles.admin.reference.referenceValue, `${ROOT}/environments/qa/kiArenaRoles/admin`);
  assert.equal(store.qa.kiArenaRoles.admin.syncedFrom.stringValue, 'dev');
  assert.ok(store.qa.kiArenaRoles.old, 'lo que solo existe en destino se conserva');
  await assert.rejects(syncEnvironments({ client, from: 'dev', to: 'users', keys: ['roles'] }), /dev, qa o prd/);
  await assert.rejects(syncEnvironments({ client, from: 'dev', to: 'qa', keys: ['players'] }), /no se puede sincronizar/);
});
