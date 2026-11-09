// Catálogo inicial de kiArenaProviderTypes. El documento en Firestore manda;
// estos valores solo se usan para sembrar el catálogo o si un documento falta.
// clientId y redirectUri se llenan por entorno en Firestore. Los secretos nunca
// van aquí: viven en Secret Manager (ver README de functions).
export const DEFAULT_PROVIDER_TYPES = Object.freeze([
  {
    code: 'password',
    name: 'Email y contraseña',
    description: 'Cuenta propia de Ki Arena con Firebase Authentication.',
    authMethod: 'firebase',
    firebaseProviderId: 'password',
    idField: 'uid',
    scopes: [],
    givesEmail: true,
    allowLogin: true,
    allowLink: true,
    order: 1
  },
  {
    code: 'google',
    name: 'Google',
    description: 'Entrar con una cuenta de Google.',
    authMethod: 'firebase',
    firebaseProviderId: 'google.com',
    idField: 'sub',
    scopes: ['openid', 'email', 'profile'],
    givesEmail: true,
    allowLogin: true,
    allowLink: true,
    docsUrl: 'https://developers.google.com/identity/openid-connect/openid-connect',
    order: 2
  },
  {
    code: 'apple',
    name: 'Apple',
    description: 'Entrar con Apple. El nombre solo llega la primera vez.',
    authMethod: 'firebase',
    firebaseProviderId: 'apple.com',
    idField: 'sub',
    scopes: ['email', 'name'],
    givesEmail: true,
    allowLogin: false,
    allowLink: false,
    docsUrl: 'https://developer.apple.com/documentation/signinwithapple/authenticating-users-with-sign-in-with-apple',
    order: 3
  },
  {
    code: 'twitch',
    name: 'Twitch',
    description: 'Entrar con la cuenta de Twitch del canal o del espectador.',
    authMethod: 'customToken',
    idField: 'sub',
    scopes: ['user:read:email'],
    givesEmail: true,
    allowLogin: true,
    allowLink: true,
    docsUrl: 'https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/',
    order: 4
  },
  {
    code: 'kick',
    name: 'Kick',
    description: 'Entrar con una cuenta de Kick (OAuth 2.1 con PKCE).',
    authMethod: 'customToken',
    idField: 'user_id',
    scopes: ['user:read'],
    givesEmail: true,
    allowLogin: true,
    allowLink: true,
    docsUrl: 'https://github.com/KickEngineering/KickDevDocs',
    order: 5
  },
  {
    code: 'tiktok',
    name: 'TikTok',
    description: 'Entrar con TikTok (Login Kit for Web). TikTok no entrega email.',
    authMethod: 'customToken',
    idField: 'open_id',
    scopes: ['user.info.basic'],
    givesEmail: false,
    allowLogin: true,
    allowLink: true,
    docsUrl: 'https://developers.tiktok.com/doc/login-kit-web',
    order: 6
  }
]);

export const FIREBASE_PROVIDER_TO_TYPE = Object.freeze({
  password: 'password',
  'google.com': 'google',
  'apple.com': 'apple'
});

export function defaultProviderType(code) {
  return DEFAULT_PROVIDER_TYPES.find(type => type.code === code) || null;
}
