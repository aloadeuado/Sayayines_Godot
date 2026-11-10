// Cliente del canal local de TikTok Live (solo existe en la app de escritorio:
// desktop/server.js atiende /api/tiktok/**). En Firebase Hosting no hace nada.

export async function tiktokAvailable() {
  try {
    const res = await fetch('/api/tiktok/status', { cache: 'no-store' });
    return res.ok && (res.headers.get('content-type') || '').includes('application/json');
  } catch {
    return false;
  }
}

// Escucha eventos y cambios de estado. Devuelve una función para cerrar.
export async function listenTikTok({ onEvent, onStatus }) {
  if (!(await tiktokAvailable())) return null;
  const source = new EventSource('/api/tiktok/events');
  source.addEventListener('tiktok', e => {
    try { onEvent?.(JSON.parse(e.data)); } catch (error) { console.warn('[tiktok] evento inválido', error); }
  });
  source.addEventListener('status', e => {
    try { onStatus?.(JSON.parse(e.data)); } catch { /* ignorado */ }
  });
  return () => source.close();
}

async function post(path, body = {}) {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const connectTikTok = username => post('/api/tiktok/connect', { username });
export const disconnectTikTok = () => post('/api/tiktok/disconnect');

// Evento simulado: pasa por el mismo camino que uno real y llega marcado simulated.
let simulatedSeq = 0;
export function simulateTikTok(event) {
  simulatedSeq += 1;
  return post('/api/tiktok/simulate', { event: { eventId: `sim_${Date.now()}_${simulatedSeq}`, ...event } });
}

export async function getTikTokStatus() {
  const res = await fetch('/api/tiktok/status', { cache: 'no-store' });
  return res.json();
}
