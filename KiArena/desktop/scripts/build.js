// Empaqueta Ki Arena para macOS (Apple Silicon e Intel) y Windows (x64) en dist/.
// Uso: npm run build  (o: node scripts/build.js darwin-arm64 win32-x64)
const path = require('node:path');
const { packager } = require('@electron/packager');

const targets = process.argv.slice(2).length ? process.argv.slice(2) : ['darwin-arm64', 'darwin-x64', 'win32-x64'];

(async () => {
  for (const target of targets) {
    const [platform, arch] = target.split('-');
    const paths = await packager({
      dir: path.join(__dirname, '..'),
      out: path.join(__dirname, '..', 'dist'),
      name: 'Ki Arena',
      executableName: platform === 'win32' ? 'KiArena' : 'Ki Arena',
      appBundleId: 'com.kiarena.desktop',
      appCategoryType: 'public.app-category.games',
      platform,
      arch,
      overwrite: true,
      // Carpeta con los zip de Electron ya descargados (opcional, sin red).
      electronZipDir: process.env.ELECTRON_ZIP_DIR || undefined,
      asar: true,
      prune: true,
      ignore: [/^\/dist($|\/)/, /^\/scripts($|\/)/, /^\/README\.md$/]
    });
    console.log(`${target}: ${paths.join(', ')}`);
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
