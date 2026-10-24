// Siembra el catálogo de razas, tipos de personaje y poderes, y migra los
// jugadores, usuarios, mensajes, eventos y ajustes existentes al modelo nuevo.
// No borra nada y no cambia niveles ni progreso: solo agrega campos que faltan.
//
// Por defecto solo muestra lo que haría. Para escribir:
//   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/migrate-character-model.js dev --apply
// Entornos: dev, qa, prd y prod (ruta antigua environments/prod, donde vive hoy
// producción hasta la migración prod → prd). prd y prod exigen --confirm-prd.
// --emulator: solo contra el Emulator Suite (FIRESTORE_EMULATOR_HOST).
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { migrateCharacterModel } from './character-migration.js';

const env = String(process.argv[2] || '').trim().toLowerCase();
const apply = process.argv.includes('--apply');
const emulator = process.argv.includes('--emulator');
if (!['dev', 'qa', 'prd', 'prod'].includes(env)) {
  console.error('Uso: node scripts/migrate-character-model.js <dev|qa|prd|prod> [--apply] [--confirm-prd] [--emulator]');
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

initializeApp({ projectId: process.env.GCLOUD_PROJECT || (emulator ? 'demo-ki-arena' : 'sayayin-c0dfe') });
const db = getFirestore();
console.log(`Entorno ${env}${emulator ? ' (emulador)' : ''} · ${apply ? 'escribiendo' : 'simulación'}`);
await migrateCharacterModel({ db, env, apply });
if (!apply) console.log('Modo simulación. Agrega --apply para escribir.');
