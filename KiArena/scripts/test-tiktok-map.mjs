// Aserciones del mapeo de TikTok Live (sin navegador ni Firestore).
// Uso: node scripts/test-tiktok-map.mjs
import assert from 'node:assert/strict';
import { mapTikTokEvent, tiktokPlayerKey, tiktokDisplayName, findGiftMapping } from '../public/src/services/tiktok/map-event.js';
import { normalizeGameSettings, DEFAULT_GAME_SETTINGS } from '../public/src/config/gameplay-settings.js';
import { DEFAULT_CATALOG, powerForCode, powerBlockReasonForCode } from '../public/src/config/game-catalog.js';

const settings = normalizeGameSettings({});
const user = { userId: '7001', uniqueId: 'goku.fan_99', nickname: 'Goku Fan' };

// Ajustes por defecto
assert.equal(settings.rejoinCooldownSeconds, 10);
assert.equal(settings.tiktok.likeHealHp, 1);
assert.equal(settings.tiktok.maxQueuedPerUser, 5);
assert.equal(settings.tiktok.gifts.find(g => g.giftName === 'Rose').powerCode, 'kiBlast');
assert.equal(settings.tiktok.gifts.find(g => g.giftName === 'Lion').powerCode, 'spiritBomb');
// Un settings viejo sin tiktok recibe los valores por defecto; uno guardado se respeta.
assert.deepEqual(normalizeGameSettings({ stats: {} }).tiktok, normalizeGameSettings(DEFAULT_GAME_SETTINGS).tiktok);
assert.equal(normalizeGameSettings({ rejoinCooldownSeconds: 30, tiktok: { likeHealHp: 2, gifts: [] } }).tiktok.likeHealHp, 2);
assert.equal(normalizeGameSettings({ rejoinCooldownSeconds: 30 }).rejoinCooldownSeconds, 30);

// ID y nombre
assert.equal(tiktokPlayerKey('7001'), 'tiktok_7001');
assert.equal(tiktokPlayerKey(''), '');
assert.equal(tiktokDisplayName({ uniqueId: '@josé*luis' }), 'josluis');
assert.equal(tiktokDisplayName({ uniqueId: 'a', userId: '55' }), 'tt_55');
assert.equal(tiktokDisplayName({ uniqueId: 'x'.repeat(40) }).length, 24);

// Chat: e/E entra, letra de poder, texto normal
for (const text of ['e', 'E', ' e ', '"e"', 'e""', 'e!', 'E 🔥']) assert.equal(mapTikTokEvent({ type: 'chat', text, ...user }, settings).action, 'join');
const join = mapTikTokEvent({ type: 'chat', text: 'e', ...user }, settings);
assert.equal(join.key, 'tiktok_7001');
assert.equal(join.name, 'goku.fan_99');
assert.deepEqual(
  { action: mapTikTokEvent({ type: 'chat', text: 'k', ...user }, settings).action, command: mapTikTokEvent({ type: 'chat', text: 'k', ...user }, settings).command },
  { action: 'command', command: 'K' });
assert.equal(mapTikTokEvent({ type: 'chat', text: 'hola', ...user }, settings).action, 'chat');
assert.equal(mapTikTokEvent({ type: 'chat', text: 'x', ...user }, settings).action, 'chat');
assert.equal(mapTikTokEvent({ type: 'chat', text: 'e', uniqueId: 'sinid' }, settings), null);

// Likes: 1 HP por like
assert.equal(mapTikTokEvent({ type: 'like', likeCount: 15, ...user }, settings).amount, 15);
assert.equal(mapTikTokEvent({ type: 'like', ...user }, settings).amount, 1);

// Regalos: por ID, por nombre, sin mapa y tope de cola
const rose = mapTikTokEvent({ type: 'gift', gift: { giftId: 5655, giftName: 'Rosa', count: 3 }, ...user }, settings);
assert.equal(rose.powerCode, 'kiBlast');
assert.equal(rose.count, 3);
assert.equal(mapTikTokEvent({ type: 'gift', gift: { giftId: 999, giftName: 'lion', count: 1 }, ...user }, settings).powerCode, 'spiritBomb');
assert.equal(mapTikTokEvent({ type: 'gift', gift: { giftId: 1, giftName: 'Galaxy', count: 1 }, ...user }, settings).powerCode, '');
assert.equal(mapTikTokEvent({ type: 'gift', gift: { giftId: 5655, count: 40 }, ...user }, settings).count, 5);
assert.equal(findGiftMapping([{ giftId: 0, giftName: 'Rose', powerCode: 'kiBlast', isActive: false }], { giftName: 'Rose' }), null);

// Poderes por code: respetan nivel y raza; la Ráfaga de Ki es para todos desde nivel 1
for (const raceCode of ['saiyajin', 'namekuseijin', 'terricola', 'freezer']) {
  assert.equal(powerForCode(DEFAULT_CATALOG, { raceCode, level: 1 }, 'kiBlast')?.engine, 'kiBlast');
}
assert.equal(powerForCode(DEFAULT_CATALOG, { raceCode: 'saiyajin', level: 19 }, 'kamehameha'), null);
assert.match(powerBlockReasonForCode(DEFAULT_CATALOG, { raceCode: 'saiyajin', level: 19 }, 'kamehameha'), /requiere nivel 20/);
assert.equal(powerForCode(DEFAULT_CATALOG, { raceCode: 'saiyajin', level: 20 }, 'kamehameha')?.engine, 'kamehameha');
// Fase 2: golpes, combos, rayos nuevos y Genkidama tienen mecánica
assert.equal(powerForCode(DEFAULT_CATALOG, { raceCode: 'saiyajin', level: 80 }, 'spiritBomb')?.engine, 'spiritBomb');
assert.match(powerBlockReasonForCode(DEFAULT_CATALOG, { raceCode: 'saiyajin', level: 79 }, 'spiritBomb'), /requiere nivel 80/);
for (const [code, raceCode, level, engine] of [['rush', 'freezer', 3, 'melee'], ['meteorCombo', 'saiyajin', 15, 'melee'], ['wolfFangFist', 'terricola', 12, 'melee'], ['dragonFist', 'saiyajin', 35, 'melee'], ['galickGun', 'saiyajin', 25, 'kamehameha'], ['finalFlash', 'saiyajin', 60, 'kamehameha']]) {
  assert.equal(powerForCode(DEFAULT_CATALOG, { raceCode, level }, code)?.engine, engine, code);
  assert.equal(powerForCode(DEFAULT_CATALOG, { raceCode, level: level - 1 }, code), null, code);
}
assert.match(powerBlockReasonForCode(DEFAULT_CATALOG, { raceCode: 'saiyajin', level: 100 }, 'masenko'), /solo está disponible/);
assert.match(powerBlockReasonForCode(DEFAULT_CATALOG, { raceCode: 'terricola', level: 100 }, 'masenko'), /todavía no está disponible/);
assert.match(powerBlockReasonForCode(DEFAULT_CATALOG, { raceCode: 'freezer', level: 100 }, 'spiritBomb'), /solo está disponible/);

console.log('test-tiktok-map: OK');
