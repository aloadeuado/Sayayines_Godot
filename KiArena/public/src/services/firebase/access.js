// Acceso por rol en el navegador: lee los roles activos del usuario en el
// entorno (kiArenaUserRoles, la tabla intermedia, manda; roleRefs del usuario
// se usa si la tabla no tiene filas) y los permisos del catálogo kiArenaRoles.
// Esto oculta pantallas; la protección real de datos necesita reglas de
// Firestore por rol (pendiente, ver HU-AUT-10).
import { plain, isActiveDoc } from './firestore-admin-client.js';

export const ROLE_PERMISSIONS_FALLBACK = Object.freeze({
  superadmin: ['*'],
  admin: ['settings.edit', 'catalog.edit', 'roles.grant', 'players.deactivate', 'bot.use']
});

export async function loadAccess({ client, env, uid }) {
  const base = `environments/${env}`;
  const userPath = `${base}/kiArenaUsers/${uid}`;
  const [user, rows, roleDocs] = await Promise.all([
    client.get(userPath),
    client.where(`${base}/kiArenaUserRoles`, [['userRef', client.ref(userPath)]]).catch(() => []),
    client.list(`${base}/kiArenaRoles`).catch(() => [])
  ]);
  const activeRows = rows.filter(isActiveDoc);
  let codes = activeRows.map(row => String(plain(row.fields.roleRef) || '').split('/').pop()).filter(Boolean);
  if (!rows.length && user) codes = (plain(user.fields.roleRefs) || []).map(path => String(path).split('/').pop());
  const roles = new Map(roleDocs.filter(isActiveDoc).map(doc => [doc.id, plain({ mapValue: { fields: doc.fields } })]));
  // Un rol desactivado en el catálogo no da permisos.
  codes = [...new Set(codes)].filter(code => roles.has(code) || (!roleDocs.length && ROLE_PERMISSIONS_FALLBACK[code]));
  const permissions = new Set(codes.flatMap(code => roles.get(code)?.permissions || ROLE_PERMISSIONS_FALLBACK[code] || []));
  const userActive = user ? isActiveDoc(user) : false;
  const can = permission => userActive && (permissions.has('*') || permissions.has(permission));
  return {
    uid, env, exists: Boolean(user), userActive, roles: codes, permissions: [...permissions],
    isSuperadmin: userActive && codes.includes('superadmin'),
    can,
    displayName: user ? plain(user.fields.displayName) : null,
    email: user ? plain(user.fields.email) : null
  };
}
