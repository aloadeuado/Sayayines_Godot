// Siembra el catálogo kiArenaProviderTypes de un entorno.
// Por defecto solo muestra lo que haría. Para escribir:
//   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/seed-provider-types.js dev --apply
// No pisa campos que ya existan (clientId, redirectUri, isActive, etc.).
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { DEFAULT_PROVIDER_TYPES } from '../src/catalog.js';
import { collectionPath, parseEnvironment } from '../src/environment.js';

const env = parseEnvironment(process.argv[2]);
const apply = process.argv.includes('--apply');

initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'sayayin-c0dfe' });
const db = getFirestore();
const now = new Date().toISOString();

for (const type of DEFAULT_PROVIDER_TYPES) {
  const ref = db.doc(`${collectionPath(env, 'providerTypes')}/${type.code}`);
  const snap = await ref.get();
  const existing = snap.exists ? snap.data() : {};
  const missing = Object.fromEntries(Object.entries({
    id: type.code,
    reference: ref,
    isActive: true,
    ...type,
    clientId: '',
    redirectUri: '',
    iconUrl: `/assets/providers/${type.code}.svg`,
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
