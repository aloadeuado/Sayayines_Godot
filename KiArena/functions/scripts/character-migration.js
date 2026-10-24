// Siembra del catálogo (razas, tipos de personaje, poderes) y migración de los
// datos existentes al modelo nuevo, en un entorno. Reglas:
// - Nada se borra ni se reemplaza: solo se agregan los campos que faltan.
// - Los jugadores conservan nivel, XP, vida, victorias y derrotas.
// - Las relaciones se guardan como referencias completas del mismo entorno.
// - Sin apply solo informa lo que haría.
import {
  DEFAULT_RACES, DEFAULT_PLAYER_TYPES, DEFAULT_POWERS, DEFAULT_CATALOG,
  catalogDocument, resolvePlayerType, powersUnlockedByLevel
} from '../../public/src/config/game-catalog.js';

export const MIGRATION_COLLECTIONS = Object.freeze({
  races: 'kiArenaRaces', playerTypes: 'kiArenaPlayerTypes', powers: 'kiArenaPowers', playerPowers: 'kiArenaPlayerPowers',
  players: 'kiArenaPlayers', users: 'kiArenaUsers', messages: 'kiArenaMessages', events: 'kiArenaEvents', settings: 'kiArenaSettings'
});

const normalize = value => String(value || '').trim().toLowerCase();
const missingOnly = (existing, wanted) => Object.fromEntries(Object.entries(wanted).filter(([key, value]) => value !== undefined && !(key in (existing || {}))));

// Curvas de ki que el operador pudo haber cambiado en settingsJson.powers: se
// copian a los poderes nuevos para no perder ese balance.
function legacyCurve(settings, power) {
  const powers = settings?.powers;
  if (!powers) return null;
  const group = power.raceCode === 'freezer' ? powers.freezer : powers.generic;
  const value = group?.[power.code];
  return value && Number.isFinite(Number(value.start)) && Number.isFinite(Number(value.end)) ? { start: Number(value.start), end: Number(value.end) } : null;
}

export async function migrateCharacterModel({ db, env, apply = false, now = new Date().toISOString(), log = console.log }) {
  const base = `environments/${env}`;
  const path = (kind, id) => `${base}/${MIGRATION_COLLECTIONS[kind]}${id === undefined ? '' : `/${id}`}`;
  const ref = (kind, id) => db.doc(path(kind, id));
  const summary = { races: 0, playerTypes: 0, powers: 0, players: 0, playerPowers: 0, users: 0, messages: 0, events: 0, settings: 0 };
  const write = async (kind, docRef, data) => {
    if (!Object.keys(data).length) return;
    summary[kind]++;
    if (apply) await docRef.set(data, { merge: true });
  };

  const settingsSnap = await ref('settings', 'gameplay').get();
  const settingsDoc = settingsSnap.exists ? settingsSnap.data() : null;
  let settings = null;
  try { settings = settingsDoc?.settingsJson ? JSON.parse(settingsDoc.settingsJson) : null; } catch { settings = null; }

  // 1. Catálogo: documentos nuevos completos; en los existentes, solo campos faltantes.
  const seed = async (kind, items, adjust = item => item) => {
    for (const item of items) {
      const docRef = ref(kind, kind === 'powers' ? item.id : item.code);
      const snap = await docRef.get();
      const doc = catalogDocument(kind, snap.exists ? item : adjust(item), ref);
      await write(kind, docRef, snap.exists
        ? missingOnly(snap.data(), { ...doc, isActive: true })
        : { ...doc, isActive: true, createdAt: now, updatedAt: now });
    }
  };
  await seed('races', DEFAULT_RACES);
  await seed('playerTypes', DEFAULT_PLAYER_TYPES, type => (
    typeof settings?.characters?.[type.code] === 'boolean' ? { ...type, isEligible: settings.characters[type.code] } : type
  ));
  await seed('powers', DEFAULT_POWERS, power => {
    const ki = legacyCurve(settings, power);
    return ki ? { ...power, multipliers: { ...power.multipliers, ki } } : power;
  });

  // 2. Jugadores: campos base, tipo de personaje y poderes ya alcanzados por nivel.
  const playerKeys = new Set();
  const playersSnap = await db.collection(path('players')).get();
  const powerRows = await db.collection(path('playerPowers')).get();
  const existingRows = new Set(powerRows.docs.map(doc => doc.id));
  for (const doc of playersSnap.docs) {
    const data = doc.data();
    playerKeys.add(doc.id);
    const type = resolvePlayerType(DEFAULT_CATALOG, data);
    const patch = missingOnly(data, {
      id: doc.id,
      reference: doc.ref,
      isActive: true,
      playerTypeRef: type ? ref('playerTypes', type.code) : undefined,
      name: data.username,
      nameKey: data.usernameKey || normalize(data.username) || doc.id,
      createdAt: data.updatedAt || now
    });
    if (Number(data.schemaVersion || 0) < 3) Object.assign(patch, { schemaVersion: 3, migratedAt: now });
    await write('players', doc.ref, patch);
    if (data.isActive === false || !type) continue;
    const level = Math.max(1, Math.min(100, Math.floor(Number(data.level) || 1)));
    for (const power of powersUnlockedByLevel(DEFAULT_CATALOG, { raceCode: type.raceCode, level })) {
      const rowId = `${doc.id}:${power.id}`;
      if (existingRows.has(rowId)) continue;
      const rowRef = ref('playerPowers', rowId);
      await write('playerPowers', rowRef, {
        id: rowId, reference: rowRef, isActive: true,
        playerRef: doc.ref, powerRef: ref('powers', power.id),
        unlockedAt: now, unlockedAtLevel: level, source: 'migration',
        timesUsed: 0, kills: 0, createdAt: now, updatedAt: now
      });
    }
  }

  // 3. Usuarios: solo campos base faltantes. No se enlazan con jugadores
  // automáticamente (regla: nunca unir cuentas sin una acción explícita).
  for (const doc of (await db.collection(path('users')).get()).docs) {
    await write('users', doc.ref, missingOnly(doc.data(), { id: doc.id, reference: doc.ref, isActive: true }));
  }

  // 4. Mensajes y eventos: campos base y referencias a los jugadores que existen.
  const playerRef = name => (playerKeys.has(normalize(name)) ? ref('players', normalize(name)) : undefined);
  for (const doc of (await db.collection(path('messages')).get()).docs) {
    const data = doc.data();
    await write('messages', doc.ref, missingOnly(data, { id: doc.id, reference: doc.ref, isActive: true, playerRef: playerRef(data.username) }));
  }
  for (const doc of (await db.collection(path('events')).get()).docs) {
    const data = doc.data();
    await write('events', doc.ref, missingOnly(data, {
      id: doc.id, reference: doc.ref, isActive: true,
      killerRef: playerRef(data.killer), victimRef: playerRef(data.victim)
    }));
  }

  // 5. Ajustes: campos base.
  if (settingsSnap.exists) {
    const docRef = ref('settings', 'gameplay');
    await write('settings', docRef, missingOnly(settingsDoc, { id: 'gameplay', reference: docRef, isActive: true }));
  }

  for (const [kind, count] of Object.entries(summary)) log(`${path(kind)}: ${count} documento(s) ${apply ? 'actualizados' : 'por actualizar'}`);
  return summary;
}
