// Da un rol a un usuario por email. Si el usuario ya existe en kiArenaUsers se
// le asigna directo (kiArenaUserRoles + roleRefs + roles). Si todavía no ha
// entrado, se deja una invitación en kiArenaRoleInvites que se aplica cuando
// entre con ese email verificado (Google lo está siempre).
//   node scripts/grant-role.js dev padbem@gmail.com superadmin            (simulación)
//   node scripts/grant-role.js dev padbem@gmail.com superadmin --rest --apply
// prd exige además --confirm-prd. No borra nada.
import { collectionPath, parseEnvironment, roleInviteDocId, userRoleDocId } from '../src/environment.js';
import { createRestAdminFirestore } from '../src/rest-backend.js';

const [envArg, emailArg, roleArg] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const env = parseEnvironment(envArg);
const email = String(emailArg || '').trim().toLowerCase();
const roleCode = String(roleArg || '').trim();
const apply = process.argv.includes('--apply');
const rest = process.argv.includes('--rest');
if (!email.includes('@') || !roleCode) {
  console.error('Uso: node scripts/grant-role.js <dev|qa|prd> <email> <rol> [--rest] [--apply] [--confirm-prd]');
  process.exit(1);
}
if (env === 'prd' && apply && !process.argv.includes('--confirm-prd')) {
  console.error('Escribir en prd exige --confirm-prd.');
  process.exit(1);
}

let db;
if (rest) {
  db = createRestAdminFirestore({ projectId: process.env.GCLOUD_PROJECT || 'sayayin-c0dfe', apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyCC4-wbqtXjfaQ2Y0z8nMg5pAuowEXLxbA' });
} else {
  const { initializeApp } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'sayayin-c0dfe' });
  db = getFirestore();
}

const now = new Date().toISOString();
const roleRef = db.doc(`${collectionPath(env, 'roles')}/${roleCode}`);
const roleSnap = await roleRef.get();
if (!roleSnap.exists || roleSnap.data().isActive === false) {
  console.error(`El rol "${roleCode}" no existe o está inactivo en ${env}. Corre primero seed:roles.`);
  process.exit(1);
}

const users = await db.collection(collectionPath(env, 'users')).where('email', '==', email).get();
const active = users.docs.filter(doc => doc.data().isActive !== false);
if (active.length > 1) console.warn(`Hay ${active.length} usuarios con ${email}: se asigna a todos.`);

for (const userSnap of active) {
  const user = userSnap.data();
  const userRef = userSnap.ref;
  const rowRef = db.doc(`${collectionPath(env, 'userRoles')}/${userRoleDocId(userSnap.id, roleCode)}`);
  const row = await rowRef.get();
  const roleRefs = [...(user.roleRefs || [])];
  if (!roleRefs.some(ref => ref.path === roleRef.path)) roleRefs.push(roleRef);
  const roles = [...new Set([...(user.roles || []), roleCode])];
  console.log(`${userRef.path} (${user.displayName || email}): ${apply ? 'asignando' : 'asignaría'} ${roleCode}`);
  if (!apply) continue;
  await rowRef.set({
    id: rowRef.id, reference: rowRef, isActive: true, userRef, roleRef, grantedByRef: null, source: 'script',
    grantedAt: now, revokedAt: null, ...(row.exists ? {} : { createdAt: now }), updatedAt: now
  }, { merge: true });
  await userRef.set({ roleRefs, roles, updatedAt: now }, { merge: true });
}

if (!active.length) {
  const inviteRef = db.doc(`${collectionPath(env, 'roleInvites')}/${roleInviteDocId(email, roleCode)}`);
  console.log(`No hay usuario con ${email} en ${env}. ${apply ? 'Creando' : 'Crearía'} invitación ${inviteRef.path}: el rol se asigna al entrar.`);
  if (apply) {
    const existing = await inviteRef.get();
    await inviteRef.set({
      id: inviteRef.id, reference: inviteRef, isActive: true, email, roleRef, createdByRef: null, source: 'script',
      usedAt: null, usedByRef: null, ...(existing.exists ? {} : { createdAt: now }), updatedAt: now
    }, { merge: true });
  }
}
if (!apply) console.log('Modo simulación. Agrega --apply para escribir.');
