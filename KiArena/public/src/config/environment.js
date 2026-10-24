// Entorno APP_ENV para los módulos nuevos (login y cuentas): dev, qa o prd.
// Orden: valor inyectado en /env.js al desplegar, luego ?env= en la URL.
// Si falta o es inválido se muestra un error; solo en local se cae a dev.
// Las vistas antiguas siguen con config/firebase.js (?env=dev|qa|prod) hasta la
// migración prod → prd, que necesita aprobación.
export const APP_ENVIRONMENTS = Object.freeze(['dev', 'qa', 'prd']);
export const ENVIRONMENT_LABELS = Object.freeze({ dev: 'Desarrollo', qa: 'QA', prd: 'Producción' });

const FIRESTORE_ROOT = 'projects/sayayin-c0dfe/databases/(default)/documents';

export function resolveAppEnv({ injected = globalThis.__KI_ARENA_ENV__, search = globalThis.location?.search || '', hostname = globalThis.location?.hostname || '' } = {}) {
  const requested = new URLSearchParams(search).get('env');
  const candidate = String(requested || injected || '').trim().toLowerCase();
  if (APP_ENVIRONMENTS.includes(candidate)) return { env: candidate, error: null };
  const local = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '';
  if (!candidate && local) return { env: 'dev', error: null };
  return { env: null, error: candidate ? `Entorno inválido: "${candidate}". Usa dev, qa o prd.` : 'No se definió el entorno (APP_ENV).' };
}

export function collectionPaths(env) {
  const base = `environments/${env}`;
  return Object.freeze({
    providerTypes: `${base}/kiArenaProviderTypes`,
    providers: `${base}/kiArenaProviders`,
    users: `${base}/kiArenaUsers`,
    userProviders: `${base}/kiArenaUserProviders`,
    userProviderEvents: `${base}/kiArenaUserProviderEvents`,
    players: `${base}/kiArenaPlayers`,
    races: `${base}/kiArenaRaces`,
    playerTypes: `${base}/kiArenaPlayerTypes`,
    powers: `${base}/kiArenaPowers`,
    playerPowers: `${base}/kiArenaPlayerPowers`
  });
}

// Referencia completa de Firestore (formato referenceValue de la API REST).
export function fullReference(path) {
  return `${FIRESTORE_ROOT}/${path}`;
}

// ?emulators=1 en localhost: usar el Firebase Emulator Suite (proyecto demo-ki-arena).
export function usesEmulators({ search = globalThis.location?.search || '', hostname = globalThis.location?.hostname || '' } = {}) {
  const local = hostname === 'localhost' || hostname === '127.0.0.1';
  return local && new URLSearchParams(search).get('emulators') === '1';
}
