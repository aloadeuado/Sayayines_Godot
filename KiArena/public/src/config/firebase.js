const environments = new Set(['dev', 'qa', 'prod']);

export function createFirebaseConfig(search = window.location.search) {
  const requested = new URLSearchParams(search).get('env');
  const environment = environments.has(requested) ? requested : 'dev';
  const params = new URLSearchParams(search);
  const local = ['localhost', '127.0.0.1'].includes(globalThis.location?.hostname);
  // ?emulators=1 en localhost: Firestore del Emulator Suite con el proyecto demo-ki-arena.
  const emulator = local && params.get('emulators') === '1';
  return Object.freeze({
    emulator,
    firestoreOrigin: emulator ? 'http://127.0.0.1:8080' : 'https://firestore.googleapis.com',
    apiKey: 'AIzaSyCC4-wbqtXjfaQ2Y0z8nMg5pAuowEXLxbA',
    authDomain: 'sayayin-c0dfe.firebaseapp.com',
    projectId: emulator ? 'demo-ki-arena' : 'sayayin-c0dfe',
    appId: '1:40160495788:web:fa559d5cef9b2d0c69f709',
    databaseId: '(default)',
    environment,
    environmentPath: `environments/${environment}/kiArena`,
    collectionPath: `environments/${environment}/kiArenaPlayers`
  });
}