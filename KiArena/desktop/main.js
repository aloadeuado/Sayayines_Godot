// Ki Arena de escritorio: un envoltorio de Electron sobre la web de Ki Arena.
// Sirve la web en http://localhost:<puerto> (localhost está autorizado por
// defecto en Firebase Auth) y reenvía el login a la función authApi.
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('node:path');
const { startServer } = require('./server');

const API_BASE = process.env.KI_ARENA_API_BASE || 'https://us-central1-sayayin-c0dfe.cloudfunctions.net/authApi';
const APP_ENV = ['dev', 'qa', 'prd'].includes(process.env.KI_ARENA_ENV) ? process.env.KI_ARENA_ENV : 'dev';
// Ventanas emergentes que Firebase Auth necesita para Google y Apple.
const AUTH_POPUP_HOSTS = ['sayayin-c0dfe.firebaseapp.com', 'accounts.google.com', 'appleid.apple.com'];

let baseUrl = '';
let mainWindow = null;

function open(route) {
  mainWindow?.loadURL(`${baseUrl}${route}${route.includes('?') ? '&' : '?'}env=${APP_ENV}`);
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  return Menu.buildFromTemplate([
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'Ki Arena',
      submenu: [
        { label: 'Arena', accelerator: 'CmdOrCtrl+1', click: () => open('/') },
        { label: 'Entrar / Mi cuenta', accelerator: 'CmdOrCtrl+2', click: () => open('/login') },
        { label: 'Bot / Chat', accelerator: 'CmdOrCtrl+3', click: () => open('/bot') },
        { label: 'Settings', accelerator: 'CmdOrCtrl+4', click: () => open('/settings') },
        { type: 'separator' },
        { role: 'reload', label: 'Recargar' },
        { role: 'togglefullscreen', label: 'Pantalla completa' },
        { role: 'toggleDevTools', label: 'Herramientas de desarrollo' },
        ...(isMac ? [] : [{ type: 'separator' }, { role: 'quit', label: 'Salir' }])
      ]
    },
    { role: 'editMenu', label: 'Editar' }
  ]);
}

async function createWindow() {
  const root = path.join(__dirname, 'app-public');
  const { port } = await startServer({ root, apiBase: API_BASE });
  baseUrl = `http://localhost:${port}`;

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 420,
    minHeight: 600,
    backgroundColor: '#0b1026',
    title: 'Ki Arena',
    webPreferences: { contextIsolation: true, sandbox: true }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const host = new URL(url).hostname;
    if (AUTH_POPUP_HOSTS.includes(host)) return { action: 'allow' };
    shell.openExternal(url);
    return { action: 'deny' };
  });

  Menu.setApplicationMenu(buildMenu());
  open('/login');
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
