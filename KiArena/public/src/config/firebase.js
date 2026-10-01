const environments = new Set(['dev', 'qa', 'prod']);

export function createFirebaseConfig(search = window.location.search) {
  const requested = new URLSearchParams(search).get('env');
  const environment = environments.has(requested) ? requested : 'dev';
  return Object.freeze({
    apiKey: 'AIzaSyCC4-wbqtXjfaQ2Y0z8nMg5pAuowEXLxbA',
    authDomain: 'sayayin-c0dfe.firebaseapp.com',
    projectId: 'sayayin-c0dfe',
    appId: '1:40160495788:web:fa559d5cef9b2d0c69f709',
    databaseId: '(default)',
    environment,
    environmentPath: `environments/${environment}/kiArena`,
    collectionPath: `environments/${environment}/kiArenaPlayers`
  });
}
