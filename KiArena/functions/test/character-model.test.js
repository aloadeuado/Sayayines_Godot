import test from 'node:test';
import assert from 'node:assert/strict';
import { FakeFirestore } from './fake-firestore.js';
import { migrateCharacterModel } from '../scripts/character-migration.js';
import {
  DEFAULT_CATALOG, DEFAULT_POWERS, buildCatalog, curveAt, powerMultipliersAt, powerSizeAt, resolvePlayerType,
  availablePowers, powerForCommand, powerBlockReasonFor
} from '../../public/src/config/game-catalog.js';
import { calculateLevelStats, normalizeGameSettings, DEFAULT_GAME_SETTINGS } from '../../public/src/config/gameplay-settings.js';

const base = 'environments/qa';
const quiet = () => {};

test('las curvas de poder escalan de forma lineal del nivel 1 al 100', () => {
  const kame = DEFAULT_POWERS.find(p => p.id === 'saiyajin_kamehameha');
  assert.equal(curveAt(kame.multipliers.ki, 1), 1.9);
  assert.equal(curveAt(kame.multipliers.ki, 100), 4.4);
  assert.ok(Math.abs(curveAt(kame.multipliers.ki, 50.5) - 3.15) < 0.02);
  assert.deepEqual(powerMultipliersAt(kame, 1), { ki: 1.9, physicalAttack: 1, kiDefense: 0.9, physicalDefense: 0.9, size: 1 });
  // Tamaño en el eje Y: baseSize × multiplicador de tamaño (30 px en N=1, ~86 px en N=100).
  assert.equal(powerSizeAt(kame, 1), 30);
  assert.ok(Math.abs(powerSizeAt(kame, 100) - 86.1) < 0.01);
  assert.equal(powerSizeAt({ width: { start: 10, end: 7 } }, 100), 7);
});

test('el race antiguo se resuelve al tipo de personaje y la raza', () => {
  assert.equal(resolvePlayerType(DEFAULT_CATALOG, { race: 3 }).code, 'freezer');
  assert.equal(resolvePlayerType(DEFAULT_CATALOG, { race: 2 }).raceCode, 'terricola');
  assert.equal(resolvePlayerType(DEFAULT_CATALOG, { race: 0, playerTypeRef: { path: `${base}/kiArenaPlayerTypes/piccolo` } }).code, 'piccolo');
});

test('los poderes disponibles dependen de raza, nivel y filas del personaje', () => {
  const freezer = { raceCode: 'freezer', level: 1 };
  assert.deepEqual(availablePowers(DEFAULT_CATALOG, freezer).map(p => p.id), ['freezer_deathRay']);
  assert.equal(powerForCommand(DEFAULT_CATALOG, { raceCode: 'freezer', level: 25 }, 'K').id, 'freezer_kamehameha');
  assert.match(powerBlockReasonFor(DEFAULT_CATALOG, { raceCode: 'saiyajin', level: 50 }, 'V'), /solo está disponible para: Freezer/);
  assert.match(powerBlockReasonFor(DEFAULT_CATALOG, { raceCode: 'saiyajin', level: 5 }, 'K'), /requiere nivel 20/);
  assert.match(powerBlockReasonFor(DEFAULT_CATALOG, { raceCode: 'saiyajin', level: 50 }, 'B'), /todavía no está disponible/);
  const removed = [{ powerId: 'freezer_deathRay', isActive: false }];
  assert.match(powerBlockReasonFor(DEFAULT_CATALOG, freezer, 'V', removed), /desactivado/);
  const granted = [{ powerRef: { path: `${base}/kiArenaPowers/freezer_deathRay` }, source: 'admin', isActive: true }];
  assert.equal(powerForCommand(DEFAULT_CATALOG, { raceCode: 'saiyajin', level: 1 }, 'V', granted).id, 'freezer_deathRay');
});

test('Firestore gana campo por campo y los desactivados salen del catálogo', () => {
  const catalog = buildCatalog({
    powers: [{ id: 'saiyajin_kamehameha', multipliers: { ki: { start: 2, end: 5 } } }, { id: 'freezer_deathRay', isActive: false }],
    playerTypes: [{ id: 'gohan', isEligible: false }]
  });
  const kame = catalog.powers.find(p => p.id === 'saiyajin_kamehameha');
  assert.deepEqual(kame.multipliers.ki, { start: 2, end: 5 });
  assert.equal(kame.multipliers.kiDefense.start, 0.9);
  assert.equal(catalog.powers.some(p => p.id === 'freezer_deathRay'), false);
  assert.equal(catalog.playerTypes.find(t => t.code === 'gohan').isEligible, false);
});

test('los multiplicadores de raza se aplican a las stats, no a la vida', () => {
  const settings = normalizeGameSettings(DEFAULT_GAME_SETTINGS);
  const plain = calculateLevelStats(10, settings);
  const saiyan = calculateLevelStats(10, settings, { ki: 1.1, physicalAttack: 1.2, physicalDefense: 0.95, kiDefense: 0.9 }, 0.03);
  assert.equal(saiyan.maxHp, plain.maxHp);
  assert.ok(Math.abs(saiyan.physicalAttack - plain.physicalAttack * 1.2 * 1.03) < 1e-9);
});

function seedLegacy(db) {
  db.write(`${base}/kiArenaPlayers/pedrodbz`, { username: 'PedroDBZ', usernameKey: 'pedrodbz', race: 3, level: 25, xp: 40, kills: 7, deaths: 2, alive: true, hp: 300, maxHp: 400, hpFormulaVersion: 2, schemaVersion: 2, updatedAt: '2026-10-01T00:00:00Z' });
  db.write(`${base}/kiArenaPlayers/goku_fan`, { username: 'goku_fan', usernameKey: 'goku_fan', race: 0, level: 9, xp: 0, kills: 1, deaths: 0, alive: false, hp: 0, maxHp: 164, schemaVersion: 2 });
  db.write(`${base}/kiArenaUsers/Xk3f`, { displayName: 'Pedro', roles: ['player'] });
  db.write(`${base}/kiArenaMessages/m1`, { username: 'PedroDBZ', text: 'K', createdAt: '2026-10-01T00:00:00Z' });
  db.write(`${base}/kiArenaEvents/e1`, { type: 'knockout', killer: 'PedroDBZ', victim: 'goku_fan', createdAt: '2026-10-01T00:00:00Z' });
  db.write(`${base}/kiArenaSettings/gameplay`, { settingsJson: JSON.stringify({ powers: { freezer: { deathRay: { start: 2.8, end: 3.6 } } }, characters: { gohan: false } }) });
}

test('la simulación no escribe nada', async () => {
  const db = new FakeFirestore();
  seedLegacy(db);
  const before = JSON.stringify([...db.store]);
  const summary = await migrateCharacterModel({ db, env: 'qa', apply: false, log: quiet });
  assert.equal(JSON.stringify([...db.store]), before);
  assert.equal(summary.players, 2);
  assert.equal(summary.powers, DEFAULT_POWERS.length);
});

test('la migración agrega campos sin borrar ni cambiar el progreso', async () => {
  const db = new FakeFirestore();
  seedLegacy(db);
  await migrateCharacterModel({ db, env: 'qa', apply: true, now: '2026-10-24T18:00:00Z', log: quiet });

  const pedro = db.read(`${base}/kiArenaPlayers/pedrodbz`);
  assert.equal(pedro.level, 25);
  assert.equal(pedro.xp, 40);
  assert.equal(pedro.kills, 7);
  assert.equal(pedro.race, 3);
  assert.equal(pedro.isActive, true);
  assert.equal(pedro.reference.path, `${base}/kiArenaPlayers/pedrodbz`);
  assert.equal(pedro.playerTypeRef.path, `${base}/kiArenaPlayerTypes/freezer`);
  assert.equal(pedro.schemaVersion, 3);

  // Nivel 25 de Freezer: todos los poderes de su raza con unlockLevel <= 25.
  const rows = db.list(`${base}/kiArenaPlayerPowers/pedrodbz:`).map(r => r.powerRef.path.split('/').pop()).sort();
  assert.ok(rows.includes('freezer_deathRay') && rows.includes('freezer_makankosappo') && rows.includes('freezer_kamehameha'));
  assert.ok(!rows.includes('freezer_deathBall'));

  // La curva cambiada en settings se conserva en el poder nuevo.
  assert.deepEqual(db.read(`${base}/kiArenaPowers/freezer_deathRay`).multipliers.ki, { start: 2.8, end: 3.6 });
  assert.equal(db.read(`${base}/kiArenaPowers/freezer_deathRay`).raceRef.path, `${base}/kiArenaRaces/freezer`);
  assert.equal(db.read(`${base}/kiArenaPlayerTypes/gohan`).isEligible, false);

  assert.equal(db.read(`${base}/kiArenaUsers/Xk3f`).isActive, true);
  assert.equal(db.read(`${base}/kiArenaMessages/m1`).playerRef.path, `${base}/kiArenaPlayers/pedrodbz`);
  const event = db.read(`${base}/kiArenaEvents/e1`);
  assert.equal(event.killerRef.path, `${base}/kiArenaPlayers/pedrodbz`);
  assert.equal(event.victimRef.path, `${base}/kiArenaPlayers/goku_fan`);
  assert.equal(db.read(`${base}/kiArenaSettings/gameplay`).isActive, true);
});

test('la migración es idempotente y respeta isActive=false', async () => {
  const db = new FakeFirestore();
  seedLegacy(db);
  db.write(`${base}/kiArenaPlayers/retirado`, { username: 'retirado', race: 1, level: 30, isActive: false });
  await migrateCharacterModel({ db, env: 'qa', apply: true, log: quiet });
  assert.equal(db.read(`${base}/kiArenaPlayers/retirado`).isActive, false);
  assert.equal(db.list(`${base}/kiArenaPlayerPowers/retirado:`).length, 0);
  const second = await migrateCharacterModel({ db, env: 'qa', apply: true, log: quiet });
  assert.deepEqual(Object.values(second).reduce((a, b) => a + b, 0), 0);
});

test('la migración agrega el multiplicador de tamaño a poderes ya sembrados sin pisar los demás', async () => {
  const db = new FakeFirestore();
  db.write(`${base}/kiArenaPowers/saiyajin_kamehameha`, { id: 'saiyajin_kamehameha', multipliers: { ki: { start: 2, end: 5 } } });
  await migrateCharacterModel({ db, env: 'qa', apply: true, log: quiet });
  const doc = db.read(`${base}/kiArenaPowers/saiyajin_kamehameha`);
  assert.deepEqual(doc.multipliers.ki, { start: 2, end: 5 });
  assert.deepEqual(doc.multipliers.size, { start: 1, end: 2.87 });
  assert.equal(doc.baseSize, 30);
});
