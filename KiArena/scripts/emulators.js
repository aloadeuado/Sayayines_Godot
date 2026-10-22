// Levanta el Firebase Emulator Suite con el proyecto de prueba demo-ki-arena,
// siembra el catálogo de proveedores y muestra la URL para probar el login.
// No toca el proyecto real. Uso: npm run emulators   (Ctrl+C para salir)
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const functionsDir = join(root, 'functions');
const PROJECT = 'demo-ki-arena';
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

if (!existsSync(join(functionsDir, 'node_modules'))) {
  console.log('Instalando dependencias de functions…');
  spawnSync(npm, ['install', '--no-audit', '--no-fund'], { cwd: functionsDir, stdio: 'inherit' });
}
// Los secretos de Twitch, Kick y TikTok no se usan en el emulador (OAuth simulado),
// pero la función los declara: se crean valores de prueba.
const secrets = join(functionsDir, '.secret.local');
if (!existsSync(secrets)) {
  writeFileSync(secrets, 'TWITCH_CLIENT_SECRET=simulado\nKICK_CLIENT_SECRET=simulado\nTIKTOK_CLIENT_SECRET=simulado\n');
}

const emulators = spawn(npx, ['firebase', 'emulators:start', '--project', PROJECT, '--only', 'auth,firestore,functions,hosting'], {
  cwd: root, stdio: 'inherit'
});

async function ready(url) {
  for (let i = 0; i < 180; i++) {
    try {
      const response = await fetch(url);
      if (response.status < 500) return true;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
}

(async () => {
  const ok = await ready('http://127.0.0.1:5000/login') && await ready('http://127.0.0.1:5001/');
  if (!ok) return console.error('Los emuladores no arrancaron a tiempo.');
  await ready(`http://127.0.0.1:5001/${PROJECT}/us-central1/authApi/api/auth/providers?env=dev`);
  for (const env of ['dev', 'qa']) {
    spawnSync(process.execPath, ['scripts/seed-provider-types.js', env, '--apply', '--emulator'], {
      cwd: functionsDir, stdio: 'inherit',
      env: { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', GCLOUD_PROJECT: PROJECT }
    });
  }
  console.log('\n  Ki Arena en emuladores (datos de prueba, nada real):');
  console.log('  Login:        http://localhost:5000/login?env=dev&emulators=1');
  console.log('  Arena:        http://localhost:5000/?env=dev&emulators=1');
  console.log('  Emulator UI:  http://localhost:4000\n');
})();

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => emulators.kill(signal));
emulators.on('exit', code => process.exit(code ?? 0));
