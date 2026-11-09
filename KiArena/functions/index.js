import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createAuthApi } from './src/auth-api.js';
import { FAKE_OAUTH_PROVIDERS } from './src/fake-oauth.js';

initializeApp();

// Secretos de cliente OAuth en Secret Manager. Se crean con:
//   firebase functions:secrets:set TWITCH_CLIENT_SECRET
const TWITCH_CLIENT_SECRET = defineSecret('TWITCH_CLIENT_SECRET');
const KICK_CLIENT_SECRET = defineSecret('KICK_CLIENT_SECRET');
const TIKTOK_CLIENT_SECRET = defineSecret('TIKTOK_CLIENT_SECRET');

// En el Emulator Suite, Twitch, Kick y TikTok se simulan con una página local.
const inEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

const handler = createAuthApi({
  ...(inEmulator ? { oauthProviders: FAKE_OAUTH_PROVIDERS, fakeOAuth: true } : {}),
  db: getFirestore(),
  auth: getAuth(),
  secrets: {
    twitch: () => TWITCH_CLIENT_SECRET.value(),
    kick: () => KICK_CLIENT_SECRET.value(),
    tiktok: () => TIKTOK_CLIENT_SECRET.value()
  }
});

export const authApi = onRequest(
  { region: 'us-central1', secrets: [TWITCH_CLIENT_SECRET, KICK_CLIENT_SECRET, TIKTOK_CLIENT_SECRET], cors: false },
  handler
);
