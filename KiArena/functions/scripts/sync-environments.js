// Sincroniza tablas de catálogo de un ambiente a otro (dev → qa → prd).
// Misma lógica que la sección «Sincronizar ambientes» de /settings.
//   node scripts/sync-environments.js dev qa                 (solo muestra diferencias)
//   node scripts/sync-environments.js dev qa --apply          (escribe en qa)
//   node scripts/sync-environments.js qa prd --apply --confirm-prd
//   --only=roles,powers   limita las tablas (por defecto: todas las sincronizables)
// No borra nada, no toca datos de usuarios ni jugadores y reescribe las
// referencias al ambiente destino. Usa la API REST con la apiKey web pública
// (las mismas reglas de seguridad que la app web).
import { createEnvSyncClient, syncEnvironments, SYNC_COLLECTIONS } from '../../public/src/services/firebase/env-sync.js';

const [from, to] = process.argv.slice(2, 4).map(v => String(v || '').toLowerCase());
const apply = process.argv.includes('--apply');
const confirmPrd = process.argv.includes('--confirm-prd');
const only = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7);
const keys = only ? only.split(',').map(s => s.trim()).filter(Boolean) : SYNC_COLLECTIONS.map(c => c.key);

const client = createEnvSyncClient({
  projectId: process.env.GCLOUD_PROJECT || 'sayayin-c0dfe',
  apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyCC4-wbqtXjfaQ2Y0z8nMg5pAuowEXLxbA'
});

try {
  const results = await syncEnvironments({ client, from, to, keys, apply, confirmPrd });
  for (const r of results) {
    const count = action => r.items.filter(i => i.action === action).length;
    console.log(`\n${r.collection} (${from} → ${to}): crear ${count('create')} · actualizar ${count('update')} · iguales ${count('same')} · solo en ${to} ${r.targetOnly.length}${apply ? ` · escritos ${r.written}` : ''}`);
    for (const i of r.items.filter(i => i.action !== 'same')) console.log(`  ${i.action === 'create' ? '+' : '~'} ${i.id}${i.action === 'update' ? `: ${i.changedFields.join(', ')}` : ''}`);
    if (r.targetOnly.length) console.log(`  = solo en ${to} (no se tocan): ${r.targetOnly.join(', ')}`);
  }
  if (!apply) console.log('\nModo simulación. Agrega --apply para escribir.');
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
