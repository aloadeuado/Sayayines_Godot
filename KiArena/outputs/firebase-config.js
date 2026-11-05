// Firebase web configuration. Firebase API keys identify the project; database
// access must be restricted with Firestore Security Rules before deployment.
const envs = ["dev", "qa", "prod"];
const requestedEnv = new URLSearchParams(window.location.search).get("env");
const environment = envs.includes(requestedEnv) ? requestedEnv : "dev";

window.KI_ARENA_FIREBASE = Object.freeze({
  apiKey: "AIzaSyCC4-wbqtXjfaQ2Y0z8nMg5pAuowEXLxbA",
  authDomain: "sayayin-c0dfe.firebaseapp.com",
  projectId: "sayayin-c0dfe",
  appId: "1:40160495788:web:fa559d5cef9b2d0c69f709",
  databaseId: "(default)",
  environment,
  environmentPath: `environments/${environment}/kiArena`,
  collectionPath: `environments/${environment}/kiArenaPlayers`
});
