// Copia KiArena/public a desktop/app-public y functions/src a desktop/app-auth
// para empaquetarlas con la app.
const fs = require('node:fs');
const path = require('node:path');

const source = path.join(__dirname, '..', '..', 'public');
const target = path.join(__dirname, '..', 'app-public');
fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(source, target, { recursive: true });
console.log(`Web copiada en ${target}`);

// authApi en modo local (cuando la Cloud Function no está desplegada): el mismo
// código de functions/src, sin dependencias de npm.
const authSource = path.join(__dirname, '..', '..', 'functions', 'src');
const authTarget = path.join(__dirname, '..', 'app-auth');
fs.rmSync(authTarget, { recursive: true, force: true });
fs.cpSync(authSource, authTarget, { recursive: true });
fs.writeFileSync(path.join(authTarget, 'package.json'), JSON.stringify({ type: 'module', private: true }, null, 2));
console.log(`Login local copiado en ${authTarget}`);
