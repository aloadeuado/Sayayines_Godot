// authApi en modo local: el mismo createAuthApi de la Cloud Function, corriendo
// dentro de un servidor Node (app de escritorio o servidor web local) con el
// backend REST. Se usa cuando la función no está desplegada (respuesta 404).
import { createAuthApi } from './auth-api.js';
import { createRestAdminFirestore, createRestAuth } from './rest-backend.js';

export const PUBLIC_WEB_CONFIG = Object.freeze({
  projectId: 'sayayin-c0dfe',
  apiKey: 'AIzaSyCC4-wbqtXjfaQ2Y0z8nMg5pAuowEXLxbA'
});

export function createLocalAuthApi({
  projectId = PUBLIC_WEB_CONFIG.projectId, apiKey = PUBLIC_WEB_CONFIG.apiKey,
  firestoreOrigin, authOrigin, fetchImpl = globalThis.fetch, transactions = true
} = {}) {
  const db = createRestAdminFirestore({ projectId, apiKey, origin: firestoreOrigin, fetchImpl, transactions });
  const auth = createRestAuth({ projectId, apiKey, origin: authOrigin, fetchImpl });
  const handler = createAuthApi({ db, auth, fetchImpl });

  // Adapta http.IncomingMessage/ServerResponse a la forma de Express que usa authApi.
  return async function handleNode(nodeReq, nodeRes, rawBody = Buffer.alloc(0)) {
    const url = new URL(nodeReq.url, 'http://localhost');
    let body = {};
    if (rawBody.length) {
      try { body = JSON.parse(rawBody.toString('utf8')); } catch { body = {}; }
    }
    const req = { method: nodeReq.method, url: nodeReq.url, path: url.pathname, query: Object.fromEntries(url.searchParams), headers: nodeReq.headers, body };
    const headers = { 'X-Ki-Arena-Auth': 'local' };
    let statusCode = 200;
    const res = {
      set(key, value) { headers[key] = value; return res; },
      status(code) { statusCode = code; return res; },
      json(payload) { nodeRes.writeHead(statusCode, { ...headers, 'Content-Type': 'application/json; charset=utf-8' }); nodeRes.end(JSON.stringify(payload)); },
      send(text) { nodeRes.writeHead(statusCode, headers); nodeRes.end(text); },
      redirect(code, location) { nodeRes.writeHead(code, { ...headers, Location: location }); nodeRes.end(); }
    };
    await handler(req, res);
  };
}
