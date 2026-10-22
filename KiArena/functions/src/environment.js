// Única fuente de rutas por entorno para las funciones (regla de datos 2).
export const ENVIRONMENTS = Object.freeze(['dev', 'qa', 'prd']);

export const COLLECTIONS = Object.freeze({
  providerTypes: 'kiArenaProviderTypes',
  providers: 'kiArenaProviders',
  users: 'kiArenaUsers',
  userProviders: 'kiArenaUserProviders',
  userProviderEvents: 'kiArenaUserProviderEvents',
  oauthStates: 'kiArenaOAuthStates',
  players: 'kiArenaPlayers'
});

export function parseEnvironment(value) {
  const env = String(value || '').trim().toLowerCase();
  if (!ENVIRONMENTS.includes(env)) {
    const error = new Error(`Entorno inválido: "${value}". Usa dev, qa o prd.`);
    error.code = 'invalid_env';
    error.status = 400;
    throw error;
  }
  return env;
}

export function collectionPath(env, name) {
  return `environments/${parseEnvironment(env)}/${COLLECTIONS[name]}`;
}

// Firestore permite casi cualquier carácter en un ID, salvo "/".
export function safeDocId(value) {
  return String(value).replace(/\//g, '%2F');
}

export function providerDocId(providerTypeId, providerUserId) {
  return safeDocId(`${providerTypeId}:${providerUserId}`);
}

export function userProviderDocId(userId, providerId) {
  return safeDocId(`${userId}:${providerId}`);
}
