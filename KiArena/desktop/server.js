// Servidor local de la app de escritorio: sirve la web de Ki Arena (copiada en
// app-public/) con las mismas rutas que Firebase Hosting y atiende /api/auth/**.
//
// Modo del login (KI_ARENA_AUTH_MODE):
// - auto (por defecto): reenvía a la Cloud Function authApi; si Google responde
//   404 porque la función no está desplegada, o no hay conexión con ella, usa
//   el modo local y se queda en él mientras la app esté abierta.
// - remote: solo la Cloud Function.
// - local: siempre el authApi local (mismo código, Firestore y Auth por REST).
//
// TikTok Live (/api/tiktok/**): si se pasa un receptor (desktop/tiktok/receiver.js),
// la arena recibe sus eventos por Server-Sent Events en /api/tiktok/events.
const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

// Sube cuando cambie el login de la app de escritorio (se ve en /login).
const STATUS_VERSION = 'login-local-2';

const ROUTES = {
  '/settings': '/settings/index.html', '/bot': '/bot/index.html', '/login': '/login/index.html',
  '/cuenta': '/login/index.html', '/admin': '/admin/index.html', '/tiktok': '/tiktok/index.html'
};
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon'
};

function resolveFile(root, pathname) {
  const clean = pathname.replace(/\/$/, '') || '/';
  const target = ROUTES[clean] || (clean === '/' ? '/index.html' : pathname);
  const file = path.normalize(path.join(root, decodeURIComponent(target)));
  if (!file.startsWith(root)) return null;
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) return path.join(file, 'index.html');
  if (!fs.existsSync(file) && fs.existsSync(`${file}.html`)) return `${file}.html`;
  return file;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function isAuthApiError(payload) {
  try {
    return typeof JSON.parse(payload.toString('utf8'))?.error === 'string';
  } catch {
    return false;
  }
}

// Llama a la Cloud Function. Devuelve null si no está desplegada (404 que no
// viene de authApi) o si no hay conexión; así se puede caer al modo local.
function forward(req, body, apiBase) {
  return new Promise(resolve => {
    const url = new URL(`${apiBase.replace(/\/$/, '')}${req.url}`);
    const headers = { ...req.headers, host: url.host, 'content-length': String(body.length) };
    const upstream = https.request(url, { method: req.method, headers, timeout: 15000 }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        const payload = Buffer.concat(chunks);
        // authApi siempre responde JSON con «error» de texto cuando falla. Un 4xx/5xx
        // sin esa forma viene de Google (función no desplegada, sin permiso, caída):
        // en ese caso se usa el login local.
        if (response.statusCode >= 400 && !isAuthApiError(payload)) return resolve(null);
        resolve({ status: response.statusCode, headers: { ...response.headers, 'x-ki-arena-auth': 'remote' }, payload });
      });
    });
    upstream.on('timeout', () => upstream.destroy(new Error('timeout')));
    upstream.on('error', () => resolve(null));
    upstream.end(body);
  });
}

function createAuthRouter({ apiBase, authMode = 'auto', localApiModule, localApiOptions = {} }) {
  let localHandler = null;
  let useLocal = authMode === 'local';
  let lastRemote = null;
  async function local() {
    if (!localHandler) {
      const mod = await import(pathToFileURL(localApiModule).href);
      localHandler = mod.createLocalAuthApi(localApiOptions);
    }
    return localHandler;
  }
  async function route(req, res) {
    const body = await readBody(req);
    if (!useLocal) {
      const remote = await forward(req, body, apiBase);
      if (remote) {
        lastRemote = remote.status;
        const headers = { ...remote.headers };
        delete headers['transfer-encoding'];
        delete headers['content-length'];
        res.writeHead(remote.status, headers);
        return res.end(remote.payload);
      }
      if (authMode === 'remote') {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'offline', message: 'No hay conexión con el servidor de login (authApi no responde o no está desplegada).' }));
      }
      useLocal = true;
      console.warn(`[ki-arena] authApi no responde como la función (${apiBase}): el login pasa a modo local.`);
    }
    try {
      await (await local())(req, res, body);
    } catch (error) {
      console.error('[ki-arena] authApi local', error);
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'internal', message: `Login local: ${error.message}` }));
    }
  }
  // Para la pantalla de login: qué servidor atiende hoy el login.
  route.status = () => ({ authMode, using: useLocal ? 'local' : lastRemote ? 'remote' : 'pending', apiBase, version: STATUS_VERSION });
  return route;
}

function sendJson(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}

// Solo páginas servidas por este mismo servidor pueden mandar órdenes: una web
// de internet abierta en otro navegador no puede conectar ni simular eventos.
function sameOrigin(req) {
  const origin = req.headers.origin;
  return !origin || origin === `http://${req.headers.host}`;
}

function createTikTokRouter(receiver) {
  const clients = new Set();
  const broadcast = (name, data) => {
    const chunk = `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of clients) res.write(chunk);
  };
  receiver.on('event', event => broadcast('tiktok', event));
  receiver.on('status', status => broadcast('status', status));
  // Mantiene viva la conexión SSE.
  setInterval(() => { for (const res of clients) res.write(': ping\n\n'); }, 20000).unref();
  return async function route(req, res) {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (req.method === 'GET' && pathname === '/api/tiktok/status') return sendJson(res, 200, receiver.status());
    if (req.method === 'GET' && pathname === '/api/tiktok/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.write(`event: status\ndata: ${JSON.stringify(receiver.status())}\n\n`);
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    if (req.method !== 'POST') return sendJson(res, 404, { error: 'not_found' });
    if (!sameOrigin(req)) return sendJson(res, 403, { error: 'forbidden' });
    let body = {};
    try {
      body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
    } catch {
      return sendJson(res, 400, { error: 'bad_json' });
    }
    try {
      if (pathname === '/api/tiktok/connect') {
        receiver.connect(body.username).catch(() => {});
        return sendJson(res, 200, receiver.status());
      }
      if (pathname === '/api/tiktok/disconnect') {
        receiver.disconnect();
        return sendJson(res, 200, receiver.status());
      }
      if (pathname === '/api/tiktok/simulate') {
        const delivered = receiver.deliver({ ...body.event, simulated: true });
        return sendJson(res, delivered ? 200 : 400, { delivered });
      }
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
    return sendJson(res, 404, { error: 'not_found' });
  };
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => { server.off('error', reject); resolve(server.address().port); });
  });
}

// port fijo para que la sesión de Firebase (guardada por origen) sobreviva al
// reiniciar la app; si está ocupado se usa uno libre.
async function startServer({ root, apiBase, port = 0, authMode = process.env.KI_ARENA_AUTH_MODE || 'auto', localApiModule, localApiOptions, tiktok = null }) {
  const authRoute = createAuthRouter({ apiBase, authMode, localApiModule, localApiOptions });
  const tiktokRoute = tiktok ? createTikTokRouter(tiktok) : null;
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/api/auth')) return authRoute(req, res);
    if (req.url.startsWith('/api/tiktok')) return tiktokRoute ? tiktokRoute(req, res) : sendJson(res, 404, { error: 'tiktok_off' });
    if (req.url.startsWith('/__ki-arena/status')) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ desktop: true, tiktok: !!tiktokRoute, ...authRoute.status() }));
    }
    const file = resolveFile(root, new URL(req.url, 'http://localhost').pathname);
    if (!file || !fs.existsSync(file)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('No encontrado');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  let actual;
  try {
    actual = await listen(server, port);
  } catch (error) {
    if (!port || error.code !== 'EADDRINUSE') throw error;
    actual = await listen(server, 0);
  }
  return { server, port: actual };
}

module.exports = { startServer };
