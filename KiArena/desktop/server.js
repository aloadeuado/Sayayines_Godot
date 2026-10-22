// Servidor local de la app de escritorio: sirve la web de Ki Arena (copiada en
// app-public/) con las mismas rutas que Firebase Hosting, y reenvía /api/auth/**
// a la función authApi desplegada.
const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

const ROUTES = { '/settings': '/settings/index.html', '/bot': '/bot/index.html', '/login': '/login/index.html', '/cuenta': '/login/index.html' };
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

function proxy(req, res, apiBase) {
  // authApi acepta la ruta completa /api/auth/...; se reenvía tal cual.
  const url = new URL(`${apiBase.replace(/\/$/, '')}${req.url}`);
  const upstream = https.request(url, { method: req.method, headers: { ...req.headers, host: url.host } }, response => {
    res.writeHead(response.statusCode, response.headers);
    response.pipe(res);
  });
  upstream.on('error', () => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'offline', message: 'No hay conexión con el servidor de login.' }));
  });
  req.pipe(upstream);
}

function startServer({ root, apiBase, port = 0 }) {
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/api/auth')) return proxy(req, res, apiBase);
    const file = resolveFile(root, new URL(req.url, 'http://localhost').pathname);
    if (!file || !fs.existsSync(file)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('No encontrado');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}

module.exports = { startServer };
