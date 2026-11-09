// OAuth simulado para el Emulator Suite: reemplaza a Twitch, Kick y TikTok
// solo cuando la función corre en el emulador (FUNCTIONS_EMULATOR=true).
// La "pantalla de permiso" es una página local donde se escribe el usuario.
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function fakeAdapter(providerTypeId) {
  return {
    usesPkce: providerTypeId === 'kick',
    authorizeUrl({ redirectUri, state }) {
      const url = new URL(redirectUri);
      url.pathname = `/api/auth/oauth/fake/${providerTypeId}`;
      url.search = new URLSearchParams({ state, redirect_uri: redirectUri }).toString();
      return url.pathname + url.search;
    },
    async fetchProfile({ code }) {
      const [, id, username] = String(code).split(':');
      if (!id) throw new Error('Código simulado inválido.');
      return {
        providerTypeId,
        providerUserId: id,
        username: username || `${providerTypeId}_${id}`,
        displayName: username || `${providerTypeId} ${id}`,
        email: providerTypeId === 'tiktok' ? undefined : `${username || id}@${providerTypeId}.test`,
        scopes: ['simulado'],
        extra: { simulated: true }
      };
    }
  };
}

export const FAKE_OAUTH_PROVIDERS = Object.freeze({
  twitch: fakeAdapter('twitch'),
  kick: fakeAdapter('kick'),
  tiktok: fakeAdapter('tiktok')
});

export function fakeConsentPage(provider, query) {
  const state = escapeHtml(query.state || '');
  const callback = escapeHtml(`/api/auth/oauth/callback/${provider}`);
  const name = escapeHtml(provider.charAt(0).toUpperCase() + provider.slice(1));
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${name} simulado</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b1026;color:#f4f7ff;font:15px system-ui,sans-serif}
form{width:min(360px,92vw);padding:22px;border:2px dashed #ffd23f;border-radius:16px;background:#111a3a;display:grid;gap:12px}
h1{margin:0;font-size:20px}p{margin:0;color:#b6c3e6;font-size:13px}label{display:grid;gap:4px;font-size:13px}
input{padding:10px;border-radius:8px;border:1px solid #2b3d78;background:#05091a;color:#fff;font:inherit}
button{padding:11px;border:0;border-radius:10px;font:700 15px system-ui;cursor:pointer;background:#f7931e;color:#fff}
.cancel{background:transparent;color:#b6c3e6;border:1px solid #2b3d78}</style></head><body>
<form method="get" action="${callback}">
<h1>${name} (simulado)</h1>
<p>Emulador local: no se contacta a ${name}. Escribe la cuenta con la que quieres entrar.</p>
<input type="hidden" name="state" value="${state}">
<label>ID en ${name}<input name="fake_id" value="141981764" required></label>
<label>Usuario<input name="fake_username" value="pedrodbz" required></label>
<button type="submit" name="fake" value="ok">Autorizar</button>
<button type="submit" name="error" value="access_denied" class="cancel" formnovalidate>Cancelar</button>
</form></body></html>`;
}
