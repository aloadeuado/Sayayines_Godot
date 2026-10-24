// Siembra el catálogo de razas, tipos de personaje y poderes, y migra los
// jugadores, usuarios, mensajes, eventos y ajustes existentes al modelo nuevo.
// No borra nada y no cambia niveles ni progreso: solo agrega campos que faltan.
//
// Por defecto solo muestra lo que haría. Para escribir:
//   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/migrate-character-model.js dev --apply
// Entornos: dev, qa, prd y prod (ruta antigua environments/prod, donde vive hoy
// producción hasta la migración prod → prd). prd y prod exigen --confirm-prd.
// --emulator: solo contra el Emulator Suite (FIRESTORE_EMULATOR_HOST).
// --rest: sin credenciales de servicio, por la API REST con la apiKey web pública
//   (mismas reglas de seguridad que la app). Ej.: node scripts/migrate-character-model.js dev --rest --apply
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { migrateCharacterModel } from './character-migration.js';
import { createRestFirestore } from './firestore-rest.js';

const WEB_API_KEY = 'AIzaSyCC4-wbqtXjfaQ2Y0z8nMg5pAuowEXLxbA';

const env = String(process.argv[2] || '').trim().toLowerCase();
const apply = process.argv.includes('--apply');
const emulator = process.argv.includes('--emulator');
const rest = process.argv.includes('--rest');
if (!['dev', 'qa', 'prd', 'prod'].includes(env)) {
  console.error('Uso: node scripts/migrate-character-model.js <dev|qa|prd|prod> [--apply] [--confirm-prd] [--emulator | --rest]');
  process.exit(1);
}
if (['prd', 'prod'].includes(env) && apply && !process.argv.includes('--confirm-prd')) {
  console.error(`Escribir en ${env} (producción) requiere --confirm-prd.`);
  process.exit(1);
}
if (emulator && !process.env.FIRESTORE_EMULATOR_HOST) {
  console.error('--emulator requiere FIRESTORE_EMULATOR_HOST (usa npm run emulators).');
  process.exit(1);
}

let db;
if (rest) {
  db = createRestFirestore({ projectId: process.env.GCLOUD_PROJECT || 'sayayin-c0dfe', apiKey: process.env.FIREBASE_API_KEY || WEB_API_KEY });
} else {
  initializeApp({ projectId: process.env.GCLOUD_PROJECT || (emulator ? 'demo-ki-arena' : 'sayayin-c0dfe') });
  db = getFirestore();
}
console.log(`Entorno ${env}${emulator ? ' (emulador)' : rest ? ' (REST)' : ''} · ${apply ? 'escribiendo' : 'simulación'}`);
await migrateCharacterModel({ db, env, apply });
if (!apply) console.log('Modo simulación. Agrega --apply para escribir.');
