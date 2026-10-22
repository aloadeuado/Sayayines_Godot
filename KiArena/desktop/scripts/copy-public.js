// Copia KiArena/public a desktop/app-public para empaquetarla con la app.
const fs = require('node:fs');
const path = require('node:path');

const source = path.join(__dirname, '..', '..', 'public');
const target = path.join(__dirname, '..', 'app-public');
fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(source, target, { recursive: true });
console.log(`Web copiada en ${target}`);
