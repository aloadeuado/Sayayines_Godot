// Siembra el catálogo kiArenaRoles de un entorno (player, streamer, partner,
// seller, admin, superadmin). Por defecto solo muestra lo que haría.
//   node scripts/seed-roles.js dev            (simulación)
//   node scripts/seed-roles.js dev --apply    (Admin SDK con credenciales)
//   node scripts/seed-roles.js dev --rest --apply  (REST con la apiKey web pública)
// prd exige además --confirm-prd. No pisa campos que ya existan: si alguien
// cambió permisos o desactivó un rol, se respeta. No borra nada.
import { DEFAULT_ROLES } from '../src/roles.js';
import { collectionPath, parseEnvironment } from '../src/environment.js';
import { createRestFirestore } from './firestore-rest.js';

const env = parseEnvironment(process.argv[2]);
const apply = process.argv.includes('--apply');
const rest = process.argv.includes('--rest');
if (env === 'prd' && apply && !process.argv.includes('--confirm-prd')) {
  console.error('Escribir en prd exige --confirm-prd.');
  process.exit(1);
}

let db;
if (rest) {
  db = createRestFirestore({ projectId: process.env.GCLOUD_PROJECT || 'sayayin-c0dfe', apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyCC4-wbqtXjfaQ2Y0z8nMg5pAuowEXLxbA' });
} else {
  // firebase-admin solo hace falta sin --rest.
  const { initializeApp } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'sayayin-c0dfe' });
  db = getFirestore();
}
const now = new Date().toISOString();

for (const role of DEFAULT_ROLES) {
  const ref = db.doc(`${collectionPath(env, 'roles')}/${role.code}`);
  const snap = await ref.get();
  const existing = snap.exists ? snap.data() : {};
  const missing = Object.fromEntries(Object.entries({
    id: role.code,
    reference: ref,
    isActive: true,
    ...role,
    createdAt: now
  }).filter(([key]) => !(key in existing)));
  if (!Object.keys(missing).length) {
    console.log(`${ref.path}: sin cambios`);
    continue;
  }
  console.log(`${ref.path}: ${apply ? 'agregando' : 'agregaría'} ${Object.keys(missing).join(', ')}`);
  if (apply) await ref.set({ ...missing, updatedAt: now }, { merge: true });
}
if (!apply) console.log('Modo simulación. Agrega --apply para escribir.');
