// Modelo de cuentas de Ki Arena: tipos de proveedor, proveedores (cuentas
// externas), usuarios y la tabla intermedia usuario-proveedor. Las relaciones
// se guardan como referencias completas de Firestore, ligadas al entorno.
// Nada se borra: desvincular o desactivar es isActive=false.
import { collectionPath, providerDocId, userProviderDocId } from './environment.js';
import { defaultProviderType } from './catalog.js';

export class AccountError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const PROFILE_FIELDS = [
  'providerUnionId', 'username', 'displayName', 'avatarUrl', 'email', 'emailVerified',
  'isPrivateEmail', 'firstName', 'lastName', 'profileUrl', 'scopes', 'extra'
];

const isActive = data => Boolean(data) && data.isActive !== false;
const clean = obj => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== ''));
const samePath = (a, b) => Boolean(a && b) && a.path === b.path;

export function createAccounts({ db, env, now = () => new Date().toISOString() }) {
  const col = name => db.collection(collectionPath(env, name));
  const refs = {
    providerType: code => col('providerTypes').doc(code),
    provider: (typeId, providerUserId) => col('providers').doc(providerDocId(typeId, providerUserId)),
    user: uid => col('users').doc(uid),
    userProvider: (uid, providerId) => col('userProviders').doc(userProviderDocId(uid, providerId)),
    newUser: () => col('users').doc(),
    newEvent: () => col('userProviderEvents').doc()
  };

  async function getProviderType(code) {
    const snap = await refs.providerType(code).get();
    const fallback = defaultProviderType(code);
    if (!snap.exists) return fallback ? { id: code, ...fallback, isActive: true, seeded: false } : null;
    const data = snap.data();
    return { ...(fallback || {}), ...data, id: code, seeded: true };
  }

  async function listProviderTypes() {
    const snap = await col('providerTypes').get();
    const stored = new Map(snap.docs.map(doc => [doc.id, doc.data()]));
    const codes = new Set([...stored.keys()]);
    for (const code of ['password', 'google', 'apple', 'twitch', 'kick', 'tiktok']) codes.add(code);
    const types = [];
    for (const code of codes) {
      const fallback = defaultProviderType(code) || {};
      const data = { ...fallback, ...(stored.get(code) || {}), id: code, code };
      if (!isActive(data)) continue;
      types.push({
        code, name: data.name || code, description: data.description || '',
        authMethod: data.authMethod, allowLogin: data.allowLogin !== false, allowLink: data.allowLink !== false,
        configured: data.authMethod === 'firebase' || Boolean(data.clientId && data.redirectUri),
        iconUrl: data.iconUrl || '', order: Number(data.order) || 99
      });
    }
    return types.sort((a, b) => a.order - b.order);
  }

  function providerRecord(profile, existing, timestamp) {
    const typeRef = refs.providerType(profile.providerTypeId);
    const record = clean({
      id: providerDocId(profile.providerTypeId, profile.providerUserId),
      reference: refs.provider(profile.providerTypeId, profile.providerUserId),
      providerTypeRef: typeRef,
      providerUserId: String(profile.providerUserId),
      ...Object.fromEntries(PROFILE_FIELDS.map(key => [key, profile[key]])),
      lastLoginAt: timestamp,
      updatedAt: timestamp
    });
    if (!existing) Object.assign(record, { isActive: true, createdAt: timestamp });
    // Apple solo entrega el nombre la primera vez: nunca se pisa con vacío.
    return record;
  }

  function eventRecord(eventRef, action, providerRef, userRef, timestamp, otherUserRef) {
    return clean({
      id: eventRef.id,
      reference: eventRef,
      isActive: true,
      action,
      providerRef,
      userRef,
      otherUserRef,
      createdAt: timestamp
    });
  }

  async function findActiveLink(tx, providerRef) {
    const query = col('userProviders').where('providerRef', '==', providerRef).where('isActive', '==', true).limit(1);
    const snap = await tx.get(query);
    return snap.docs[0] || null;
  }

  function assertProfile(profile) {
    if (!profile || !profile.providerTypeId || !profile.providerUserId) {
      throw new AccountError('invalid_profile', 'El proveedor no entregó un ID estable.');
    }
  }

  // Entrar con un proveedor. Si la cuenta externa ya está vinculada, devuelve a
  // su usuario. Si no, crea el usuario (con preferredUid para Google, Apple y
  // email, que ya tienen uid en Firebase Auth) y su primer vínculo.
  async function signIn({ profile, preferredUid = null, seed = {} }) {
    assertProfile(profile);
    return db.runTransaction(async tx => {
      const timestamp = now();
      const providerRef = refs.provider(profile.providerTypeId, profile.providerUserId);
      const typeRef = refs.providerType(profile.providerTypeId);
      const providerSnap = await tx.get(providerRef);
      const link = await findActiveLink(tx, providerRef);

      if (link) {
        const userRef = link.data().userRef;
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists || !isActive(userSnap.data())) {
          throw new AccountError('user_inactive', 'Este usuario está desactivado.', 403);
        }
        tx.set(providerRef, providerRecord(profile, providerSnap.exists, timestamp), { merge: true });
        tx.set(userRef, { lastLoginAt: timestamp, updatedAt: timestamp }, { merge: true });
        return { status: 'ok', created: false, userId: userRef.id };
      }

      const userRef = preferredUid ? refs.user(preferredUid) : refs.newUser();
      const userSnap = await tx.get(userRef);
      if (userSnap.exists && !isActive(userSnap.data())) {
        throw new AccountError('user_inactive', 'Este usuario está desactivado.', 403);
      }
      const upRef = refs.userProvider(userRef.id, providerRef.id);
      const upSnap = await tx.get(upRef);
      const current = userSnap.exists ? userSnap.data() : null;
      const activeRefs = (current?.userProviderRefs || []).filter(ref => !samePath(ref, upRef));
      const typeRefs = (current?.providerTypeRefs || []).filter(ref => !samePath(ref, typeRef));
      const isPrimary = activeRefs.length === 0;

      tx.set(providerRef, providerRecord(profile, providerSnap.exists, timestamp), { merge: true });
      tx.set(upRef, {
        id: upRef.id,
        reference: upRef,
        isActive: true,
        userRef,
        providerRef,
        providerTypeRef: typeRef,
        isPrimary,
        linkedAt: timestamp,
        unlinkedAt: null,
        updatedAt: timestamp
      }, { merge: true });
      tx.set(userRef, clean({
        id: userRef.id,
        reference: userRef,
        isActive: true,
        displayName: current?.displayName || seed.displayName || profile.displayName || profile.username,
        avatarUrl: current?.avatarUrl || profile.avatarUrl,
        email: current?.email || (profile.emailVerified !== false ? profile.email : undefined),
        emailVerified: current?.emailVerified ?? (profile.email ? profile.emailVerified === true : undefined),
        userProviderRefs: [...activeRefs, upRef],
        primaryUserProviderRef: isPrimary ? upRef : current?.primaryUserProviderRef,
        providerTypeRefs: [...typeRefs, typeRef],
        roles: current?.roles || ['player'],
        createdAt: current?.createdAt || timestamp,
        updatedAt: timestamp,
        lastLoginAt: timestamp,
        schemaVersion: 1
      }), { merge: true });
      const eventRef = refs.newEvent();
      tx.set(eventRef, eventRecord(eventRef, upSnap.exists ? 'relink' : 'link', providerRef, userRef, timestamp));
      return { status: 'ok', created: !userSnap.exists, userId: userRef.id };
    });
  }

  // Vincular una cuenta externa al usuario que ya inició sesión.
  async function link({ profile, userId }) {
    assertProfile(profile);
    return db.runTransaction(async tx => {
      const timestamp = now();
      const userRef = refs.user(userId);
      const providerRef = refs.provider(profile.providerTypeId, profile.providerUserId);
      const typeRef = refs.providerType(profile.providerTypeId);
      const upRef = refs.userProvider(userId, providerRef.id);
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists || !isActive(userSnap.data())) {
        throw new AccountError('user_not_found', 'Primero inicia sesión con tu cuenta de Ki Arena.', 404);
      }
      const providerSnap = await tx.get(providerRef);
      const active = await findActiveLink(tx, providerRef);
      const upSnap = await tx.get(upRef);

      if (active && samePath(active.data().userRef, userRef)) {
        tx.set(providerRef, providerRecord(profile, providerSnap.exists, timestamp), { merge: true });
        return { status: 'already_linked', userId };
      }
      if (active) {
        const eventRef = refs.newEvent();
        tx.set(eventRef, eventRecord(eventRef, 'conflict', providerRef, userRef, timestamp, active.data().userRef));
        return { status: 'conflict', userId };
      }

      const user = userSnap.data();
      const activeRefs = (user.userProviderRefs || []).filter(ref => !samePath(ref, upRef));
      const typeRefs = (user.providerTypeRefs || []).filter(ref => !samePath(ref, typeRef));
      tx.set(providerRef, providerRecord(profile, providerSnap.exists, timestamp), { merge: true });
      tx.set(upRef, {
        id: upRef.id,
        reference: upRef,
        isActive: true,
        userRef,
        providerRef,
        providerTypeRef: typeRef,
        isPrimary: activeRefs.length === 0,
        linkedAt: timestamp,
        unlinkedAt: null,
        updatedAt: timestamp
      }, { merge: true });
      tx.set(userRef, clean({
        userProviderRefs: [...activeRefs, upRef],
        providerTypeRefs: [...typeRefs, typeRef],
        primaryUserProviderRef: activeRefs.length === 0 ? upRef : user.primaryUserProviderRef,
        avatarUrl: user.avatarUrl || profile.avatarUrl,
        updatedAt: timestamp
      }), { merge: true });
      const eventRef = refs.newEvent();
      tx.set(eventRef, eventRecord(eventRef, upSnap.exists ? 'relink' : 'link', providerRef, userRef, timestamp));
      return { status: 'linked', userId };
    });
  }

  // Desvincular. Nunca la última cuenta: el usuario se quedaría sin forma de entrar.
  async function unlink({ userId, userProviderId }) {
    return db.runTransaction(async tx => {
      const timestamp = now();
      const userRef = refs.user(userId);
      const upRef = col('userProviders').doc(userProviderId);
      const userSnap = await tx.get(userRef);
      const upSnap = await tx.get(upRef);
      if (!userSnap.exists || !upSnap.exists || !samePath(upSnap.data().userRef, userRef)) {
        throw new AccountError('link_not_found', 'Esa cuenta no está vinculada a tu usuario.', 404);
      }
      if (!isActive(upSnap.data())) return { status: 'already_unlinked' };
      const query = col('userProviders').where('userRef', '==', userRef).where('isActive', '==', true);
      const activeSnap = await tx.get(query);
      const remaining = activeSnap.docs.filter(doc => doc.id !== upRef.id);
      if (remaining.length === 0) {
        throw new AccountError('last_link', 'No puedes desvincular tu única forma de entrar.', 409);
      }
      const removed = upSnap.data();
      const wasPrimary = removed.isPrimary === true || samePath(userSnap.data().primaryUserProviderRef, upRef);
      const nextPrimary = wasPrimary
        ? [...remaining].sort((a, b) => String(a.data().linkedAt).localeCompare(String(b.data().linkedAt)))[0]
        : null;

      tx.set(upRef, { isActive: false, isPrimary: false, unlinkedAt: timestamp, updatedAt: timestamp }, { merge: true });
      if (nextPrimary) tx.set(nextPrimary.ref, { isPrimary: true, updatedAt: timestamp }, { merge: true });
      const typeRefs = [];
      for (const doc of remaining) {
        const ref = doc.data().providerTypeRef;
        if (ref && !typeRefs.some(existing => samePath(existing, ref))) typeRefs.push(ref);
      }
      tx.set(userRef, clean({
        userProviderRefs: remaining.map(doc => doc.ref),
        providerTypeRefs: typeRefs,
        primaryUserProviderRef: nextPrimary ? nextPrimary.ref : undefined,
        updatedAt: timestamp
      }), { merge: true });
      const eventRef = refs.newEvent();
      tx.set(eventRef, eventRecord(eventRef, 'unlink', removed.providerRef, userRef, timestamp));
      return { status: 'unlinked', providerTypeId: removed.providerTypeRef?.id || null };
    });
  }

  async function getAccount(userId) {
    const userSnap = await refs.user(userId).get();
    if (!userSnap.exists || !isActive(userSnap.data())) return null;
    const linksSnap = await col('userProviders').where('userRef', '==', userSnap.ref).where('isActive', '==', true).get();
    const links = [];
    for (const doc of linksSnap.docs) {
      const data = doc.data();
      const providerSnap = await data.providerRef.get();
      const provider = providerSnap.exists ? providerSnap.data() : {};
      links.push({
        userProviderId: doc.id,
        providerTypeId: data.providerTypeRef?.id || null,
        isPrimary: data.isPrimary === true,
        linkedAt: data.linkedAt || null,
        username: provider.username || null,
        displayName: provider.displayName || null,
        avatarUrl: provider.avatarUrl || null,
        email: provider.email || null
      });
    }
    const user = userSnap.data();
    return {
      user: {
        id: userSnap.id,
        displayName: user.displayName || null,
        avatarUrl: user.avatarUrl || null,
        email: user.email || null,
        roles: user.roles || [],
        createdAt: user.createdAt || null,
        lastLoginAt: user.lastLoginAt || null
      },
      links: links.sort((a, b) => String(a.linkedAt).localeCompare(String(b.linkedAt)))
    };
  }

  async function updateProfile(userId, { displayName }) {
    const name = String(displayName || '').trim().slice(0, 40);
    if (!name) throw new AccountError('invalid_name', 'Escribe un nombre de guerrero.');
    await refs.user(userId).set({ displayName: name, updatedAt: now() }, { merge: true });
  }

  return { refs, getProviderType, listProviderTypes, signIn, link, unlink, getAccount, updateProfile };
}
