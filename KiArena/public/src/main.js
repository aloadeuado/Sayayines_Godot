import { createFirebaseConfig } from './config/firebase.js';
import { createArenaCloud } from './services/firebase/arena-cloud.js';
import { startArena } from './app/arena-app.js';

const firebaseConfig = createFirebaseConfig();
window.KI_ARENA_FIREBASE = firebaseConfig;
window.kiArenaCloud = createArenaCloud(firebaseConfig);
startArena();
