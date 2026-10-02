import { createFirebaseConfig } from './config/firebase.js';
import { createArenaCloud } from './services/firebase/arena-cloud.js';
import { startArena } from './app/arena-app.js';
import { startBot } from './app/bot-app.js';
import { startSettings } from './app/settings-app.js';

const firebaseConfig = createFirebaseConfig();
window.KI_ARENA_FIREBASE = firebaseConfig;
window.kiArenaCloud = createArenaCloud(firebaseConfig);

const path = window.location.pathname.toLowerCase().replace(/\/index\.html$/, '').replace(/\/$/, '');
if (path.endsWith('/settings')) {
  startSettings();
} else if (path.endsWith('/bot')) {
  startBot();
} else {
  startArena();
}
