// Catálogo inicial de kiArenaRoles (Pedro, 2026-11-05). El documento en
// Firestore manda: estos valores solo se usan para sembrar un entorno vacío.
// Los permisos y niveles son un punto de partida, editables por entorno.
// level: jerarquía; un rol solo puede dar roles de nivel menor al suyo.
export const DEFAULT_USER_ROLE = 'player';

export const DEFAULT_ROLES = Object.freeze([
  {
    code: 'player',
    name: 'Jugador',
    description: 'Juega en la arena y administra su propia cuenta. Se da al registrarse.',
    permissions: ['arena.play', 'account.manage'],
    level: 10,
    order: 1
  },
  {
    code: 'streamer',
    name: 'Streamer',
    description: 'Transmite Ki Arena en su canal y usa el panel /bot durante el stream.',
    permissions: ['arena.play', 'account.manage', 'bot.use'],
    level: 30,
    order: 2
  },
  {
    code: 'partner',
    name: 'Partner',
    description: 'Socio o aliado de Ki Arena (canales, marcas, comunidades).',
    permissions: ['arena.play', 'account.manage', 'partner.view'],
    level: 40,
    order: 3
  },
  {
    code: 'seller',
    name: 'Vendedor',
    description: 'Gestiona ventas y paquetes para streamers y partners.',
    permissions: ['arena.play', 'account.manage', 'sales.manage'],
    level: 40,
    order: 4
  },
  {
    code: 'admin',
    name: 'Administrador',
    description: 'Opera y balancea el juego: /bot, settings, catálogos y roles de nivel menor.',
    permissions: ['arena.play', 'account.manage', 'bot.use', 'settings.edit', 'catalog.edit', 'roles.grant', 'players.deactivate'],
    level: 80,
    order: 5
  },
  {
    code: 'superadmin',
    name: 'Superadministrador',
    description: 'Todo lo del administrador, más dar cualquier rol y sincronizar entre ambientes (incluido prd).',
    permissions: ['*'],
    level: 100,
    order: 6
  }
]);

export function defaultRole(code) {
  return DEFAULT_ROLES.find(role => role.code === code) || null;
}
