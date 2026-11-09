// OAuth de servidor para las plataformas que Firebase Auth no trae de fábrica.
// Cada adaptador arma la URL de autorización, cambia el código por un token y
// devuelve un perfil normalizado. Los tokens no se guardan: solo sirven para leer
// el perfil durante el login.
import { createHash, randomBytes } from 'node:crypto';

export const base64Url = buffer => Buffer.from(buffer).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const randomToken = (bytes = 32) => base64Url(randomBytes(bytes));
export const pkceChallenge = verifier => base64Url(createHash('sha256').update(verifier).digest());

async function postForm(fetchImpl, url, params) {
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString()
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) {
    throw new Error(`Token ${response.status}: ${body.error_description || body.message || body.error || 'sin detalle'}`);
  }
  return body;
}

async function getJson(fetchImpl, url, headers) {
  const response = await fetchImpl(url, { headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Perfil ${response.status}: ${body.message || body.error?.message || 'sin detalle'}`);
  return body;
}

const scopeList = value => (Array.isArray(value) ? value : String(value || '').split(/[\s,]+/)).filter(Boolean);

export const OAUTH_PROVIDERS = Object.freeze({
  twitch: {
    usesPkce: false,
    authorizeUrl({ clientId, redirectUri, scopes, state }) {
      const url = new URL('https://id.twitch.tv/oauth2/authorize');
      url.search = new URLSearchParams({
        client_id: clientId, redirect_uri: redirectUri, response_type: 'code',
        scope: scopes.join(' '), state, force_verify: 'true'
      }).toString();
      return url.toString();
    },
    async fetchProfile({ code, clientId, clientSecret, redirectUri, fetchImpl }) {
      const token = await postForm(fetchImpl, 'https://id.twitch.tv/oauth2/token', {
        client_id: clientId, client_secret: clientSecret, code, grant_type: 'authorization_code', redirect_uri: redirectUri
      });
      const body = await getJson(fetchImpl, 'https://api.twitch.tv/helix/users', {
        Authorization: `Bearer ${token.access_token}`, 'Client-Id': clientId
      });
      const user = body.data?.[0];
      if (!user?.id) throw new Error('Twitch no devolvió el usuario.');
      return {
        providerTypeId: 'twitch',
        providerUserId: String(user.id),
        username: user.login,
        displayName: user.display_name,
        avatarUrl: user.profile_image_url,
        email: user.email || undefined,
        emailVerified: user.email ? true : undefined,
        scopes: scopeList(token.scope),
        extra: { broadcasterType: user.broadcaster_type || '' }
      };
    }
  },

  kick: {
    usesPkce: true,
    authorizeUrl({ clientId, redirectUri, scopes, state, codeChallenge }) {
      const url = new URL('https://id.kick.com/oauth/authorize');
      url.search = new URLSearchParams({
        response_type: 'code', client_id: clientId, redirect_uri: redirectUri, scope: scopes.join(' '),
        code_challenge: codeChallenge, code_challenge_method: 'S256', state
      }).toString();
      return url.toString();
    },
    async fetchProfile({ code, clientId, clientSecret, redirectUri, codeVerifier, fetchImpl }) {
      const token = await postForm(fetchImpl, 'https://id.kick.com/oauth/token', {
        code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri,
        grant_type: 'authorization_code', code_verifier: codeVerifier
      });
      const body = await getJson(fetchImpl, 'https://api.kick.com/public/v1/users', {
        Authorization: `Bearer ${token.access_token}`
      });
      const user = body.data?.[0];
      if (user?.user_id === undefined) throw new Error('Kick no devolvió el usuario.');
      return {
        providerTypeId: 'kick',
        providerUserId: String(user.user_id),
        username: user.name,
        avatarUrl: user.profile_picture,
        email: user.email || undefined,
        scopes: scopeList(token.scope)
      };
    }
  },

  tiktok: {
    usesPkce: false,
    authorizeUrl({ clientId, redirectUri, scopes, state }) {
      const url = new URL('https://www.tiktok.com/v2/auth/authorize/');
      url.search = new URLSearchParams({
        client_key: clientId, scope: scopes.join(','), response_type: 'code', redirect_uri: redirectUri, state
      }).toString();
      return url.toString();
    },
    async fetchProfile({ code, clientId, clientSecret, redirectUri, fetchImpl }) {
      const token = await postForm(fetchImpl, 'https://open.tiktokapis.com/v2/oauth/token/', {
        client_key: clientId, client_secret: clientSecret, code, grant_type: 'authorization_code', redirect_uri: redirectUri
      });
      const granted = scopeList(token.scope);
      const fields = ['open_id', 'union_id', 'avatar_url', 'display_name'];
      if (granted.includes('user.info.profile')) fields.push('username', 'profile_deep_link', 'is_verified');
      const body = await getJson(fetchImpl, `https://open.tiktokapis.com/v2/user/info/?fields=${fields.join(',')}`, {
        Authorization: `Bearer ${token.access_token}`
      });
      const user = body.data?.user;
      if (!user?.open_id) throw new Error('TikTok no devolvió el usuario.');
      return {
        providerTypeId: 'tiktok',
        providerUserId: String(user.open_id),
        providerUnionId: user.union_id || undefined,
        username: user.username || undefined,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        profileUrl: user.profile_deep_link || undefined,
        scopes: granted,
        extra: user.is_verified === undefined ? undefined : { isVerified: user.is_verified === true }
      };
    }
  }
});
