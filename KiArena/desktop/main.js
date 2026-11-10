// Ki Arena de escritorio: un envoltorio de Electron sobre la web de Ki Arena.
// Sirve la web en http://localhost:<puerto> (localhost está autorizado por
// defecto en Firebase Auth) y reenvía el login a la función authApi.
const { app, BrowserWindow, Menu, screen, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { startServer } = require('./server');
const { TikTokReceiver } = require('./tiktok/receiver');

const API_BASE = process.env.KI_ARENA_API_BASE || 'https://us-central1-sayayin-c0dfe.cloudfunctions.net/authApi';
const APP_ENV = ['dev', 'qa', 'prd'].includes(process.env.KI_ARENA_ENV) ? process.env.KI_ARENA_ENV : 'dev';
// Ventanas emergentes que Firebase Auth necesita para Google y Apple.
const AUTH_POPUP_HOSTS = ['sayayin-c0dfe.firebaseapp.com', 'accounts.google.com', 'appleid.apple.com'];
// La arena va en su propia ventana (la que se captura en OBS). Tamaño del área de
// juego por orientación; la web dibuja con el mismo aspecto (?layout=).
const ARENA_LAYOUTS = {
  horizontal: { label: 'Horizontal (5:3)', width: 1200, height: 720 },
  vertical: { label: 'Vertical (9:16, TikTok)', width: 540, height: 960 }
};
const ARENA_PATHS = ['/', '/index.html', '/ki-arena.html'];

let baseUrl = '';
let mainWindow = null;
let arenaWindow = null;
let arenaLayout = 'horizontal';
let tiktok = null;

function urlFor(route, extra = '') {
  return `${baseUrl}${route}${route.includes('?') ? '&' : '?'}env=${APP_ENV}${extra}`;
}

function open(route) {
  mainWindow?.loadURL(urlFor(route));
}

// Preferencias del escritorio (orientación de la arena) en la carpeta de datos de la app.
function prefsPath() {
  return path.join(app.getPath('userData'), 'preferencias.json');
}

function readPrefs() {
  try {
    return JSON.parse(fs.readFileSync(prefsPath(), 'utf8'));
  } catch {
    return {};
  }
}

function writePrefs(prefs) {
  try {
    fs.writeFileSync(prefsPath(), JSON.stringify({ ...readPrefs(), ...prefs }, null, 2));
  } catch (error) {
    console.warn('No se guardaron las preferencias:', error.message);
  }
}

// API key de firma de Euler Stream para TikTok Live (opcional). Variable
// TIKTOK_SIGN_API_KEY o, en desarrollo, config/environments/<env>.local.env
// (ignorado por Git). Nunca va a public/ ni a Firestore.
function tiktokSignKey() {
  if (process.env.TIKTOK_SIGN_API_KEY) return process.env.TIKTOK_SIGN_API_KEY;
  try {
    const file = path.join(__dirname, '..', 'config', 'environments', APP_ENV + '.local.env');
    const line = fs.readFileSync(file, 'utf8').split(/\r?\n/).find(l => l.startsWith('TIKTOK_SIGN_API_KEY='));
    return line ? line.slice('TIKTOK_SIGN_API_KEY='.length).trim() : '';
  } catch {
    return '';
  }
}

// Tamaño de la ventana de la arena: el de la orientación, reducido si no cabe en la pantalla.
function arenaContentSize() {
  const { width, height } = ARENA_LAYOUTS[arenaLayout];
  const area = screen.getPrimaryDisplay().workAreaSize;
  const scale = Math.min(1, (area.width - 40) / width, (area.height - 80) / height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function arenaUrl() {
  return urlFor('/', `&view=window&layout=${arenaLayout}`);
}

function externalOnly({ url }) {
  shell.openExternal(url);
  return { action: 'deny' };
}

function isArenaUrl(url) {
  const target = new URL(url);
  return target.origin === baseUrl && ARENA_PATHS.includes(target.pathname);
}

function openArenaWindow() {
  if (arenaWindow) {
    if (arenaWindow.isMinimized()) arenaWindow.restore();
    arenaWindow.focus();
    return;
  }
  const { width, height } = arenaContentSize();
  arenaWindow = new BrowserWindow({
    width,
    height,
    useContentSize: true,
    minWidth: 270,
    minHeight: 270,
    backgroundColor: '#000000',
    // Sin barra de menú en Windows/Linux (Alt la muestra): la captura queda limpia.
    autoHideMenuBar: true,
    title: 'Ki Arena · Arena',
    // Sin pausar la simulación cuando la ventana queda detrás de OBS.
    webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false }
  });
  // Título fijo para elegir la ventana en OBS (Captura de ventana).
  arenaWindow.on('page-title-updated', (event) => event.preventDefault());
  arenaWindow.webContents.setWindowOpenHandler(externalOnly);
  arenaWindow.on('closed', () => { arenaWindow = null; });
  // La ventana de la arena no muestra menú: clic derecho para la orientación y las instrucciones.
  arenaWindow.webContents.on('context-menu', () => {
    Menu.buildFromTemplate([...orientationItems(), { type: 'separator' }, instructionsItem()]).popup({ window: arenaWindow });
  });
  arenaWindow.loadURL(arenaUrl());
}

function orientationItems() {
  return Object.entries(ARENA_LAYOUTS).map(([layout, { label }]) => ({
    label,
    type: 'radio',
    checked: layout === arenaLayout,
    click: () => setArenaLayout(layout)
  }));
}

// Recuadro de instrucciones de la arena (también con la tecla I dentro de la ventana).
function instructionsItem() {
  return { label: 'Mostrar / ocultar instrucciones', accelerator: 'CmdOrCtrl+Shift+H', click: toggleInstructions };
}

function toggleInstructions() {
  if (!arenaWindow) return openArenaWindow();
  arenaWindow.webContents.executeJavaScript('window.kiArenaInstructions?.toggle()').catch(() => {});
}

function toggleArenaLayout() {
  setArenaLayout(arenaLayout === 'vertical' ? 'horizontal' : 'vertical');
}

function setArenaLayout(layout) {
  if (!ARENA_LAYOUTS[layout] || layout === arenaLayout) return;
  arenaLayout = layout;
  writePrefs({ arenaLayout });
  Menu.setApplicationMenu(buildMenu());
  if (!arenaWindow) return openArenaWindow();
  const { width, height } = arenaContentSize();
  arenaWindow.setContentSize(width, height);
  arenaWindow.loadURL(arenaUrl());
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  return Menu.buildFromTemplate([
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'Ki Arena',
      submenu: [
        { label: 'Abrir ventana de la arena', accelerator: 'CmdOrCtrl+1', click: openArenaWindow },
        { label: 'Orientación de la arena', submenu: orientationItems() },
        { label: 'Cambiar horizontal / vertical', accelerator: 'CmdOrCtrl+Shift+O', click: toggleArenaLayout },
        instructionsItem(),
        { type: 'separator' },
        { label: 'Entrar / Mi cuenta', accelerator: 'CmdOrCtrl+2', click: () => open('/login') },
        { label: 'Bot / Chat', accelerator: 'CmdOrCtrl+3', click: () => open('/bot') },
        { label: 'Settings', accelerator: 'CmdOrCtrl+4', click: () => open('/settings') },
        { label: 'Panel superadmin', accelerator: 'CmdOrCtrl+5', click: () => open('/admin') },
        { type: 'separator' },
        { role: 'reload', label: 'Recargar' },
        { role: 'togglefullscreen', label: 'Pantalla completa' },
        { role: 'toggleDevTools', label: 'Herramientas de desarrollo' },
        ...(isMac ? [] : [{ type: 'separator' }, { role: 'quit', label: 'Salir' }])
      ]
    },
    {
      label: 'TikTok Live',
      submenu: [
        { label: 'Conectar / estado…', accelerator: 'CmdOrCtrl+6', click: () => open('/tiktok') },
        { label: 'Desconectar', click: () => { tiktok?.disconnect(); writePrefs({ tiktokUsername: '' }); } }
      ]
    },
    { role: 'editMenu', label: 'Editar' }
  ]);
}

async function createWindow() {
  const root = path.join(__dirname, 'app-public');
  // Puerto fijo: Firebase guarda la sesión por origen (localhost:puerto).
  tiktok = new TikTokReceiver({ signApiKey: tiktokSignKey() });
  // Recuerda el @usuario conectado para reconectar al abrir la app.
  tiktok.on('status', ({ state, username }) => {
    if (state === 'connected') writePrefs({ tiktokUsername: username });
  });
  const { port } = await startServer({
    root, tiktok, apiBase: API_BASE, port: Number(process.env.KI_ARENA_PORT) || 47321,
    localApiModule: path.join(__dirname, 'app-auth', 'local-api.js')
  });
  baseUrl = `http://localhost:${port}`;
  const savedLayout = readPrefs().arenaLayout;
  if (ARENA_LAYOUTS[savedLayout]) arenaLayout = savedLayout;

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
    return externalOnly({ url });
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
    arenaWindow?.close();
  });
  // Los enlaces a la arena ("Volver a la arena", "Ir a la arena") abren su ventana,
  // así nunca corren dos simulaciones a la vez.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isArenaUrl(url)) return;
    event.preventDefault();
    openArenaWindow();
  });

  Menu.setApplicationMenu(buildMenu());
  open('/login');
  const savedTikTok = readPrefs().tiktokUsername;
  if (savedTikTok) tiktok.connect(savedTikTok).catch(() => {});
}

app.whenReady().then(createWindow);
// Al cerrar la principal (o la última ventana) se cierra la app, arena incluida.
app.on('window-all-closed', () => {
  tiktok?.disconnect(false);
  app.quit();
});
