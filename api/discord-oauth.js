// api/discord-oauth.js — Discord OAuth callback with signed Stellar session
import { createSession } from './_auth.js';

function fragment(values) {
  return new URLSearchParams(values).toString();
}

export default async function handler(req, res) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI || 'https://trystellarai.com/api/discord-oauth';
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  const { code, error } = req.query;

  if (!code && !error) {
    if (!clientId) return res.status(500).json({ error: 'Discord is not configured.' });
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'identify email',
    });
    return res.redirect(`https://discord.com/oauth2/authorize?${params}`);
  }

  if (error) return res.redirect('/app?auth_error=discord_cancelled');
  if (!clientId || !clientSecret || !kvUrl || !kvToken) return res.redirect('/app?auth_error=discord_not_configured');

  try {
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });
    const token = await tokenResponse.json();
    if (!token.access_token) return res.redirect('/app?auth_error=discord_token_failed');

    const profileResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const profile = await profileResponse.json();
    const email = String(profile.email || '').toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.redirect('/app?auth_error=discord_no_email');

    const authKey = `stellar:auth:${email}`;
    const userKey = `stellar:user:${email}`;
    const storedResponse = await fetch(`${kvUrl}/get/${encodeURIComponent(authKey)}`, {
      headers: { Authorization: `Bearer ${kvToken}` },
    });
    const storedResult = (await storedResponse.json()).result;

    if (!storedResult) {
      const now = Date.now();
      const authRecord = { discord: true, discordId: profile.id, discordUsername: profile.username, createdAt: now };
      const userRecord = { plan: 'free', walletPence: 100, welcomeCreditGiven: true, welcomeCreditAt: now, createdAt: now, signInSource: 'discord' };
      const write = await fetch(`${kvUrl}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${kvToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([
          ['SET', authKey, JSON.stringify(authRecord)],
          ['SET', userKey, JSON.stringify(userRecord)],
        ]),
      });
      if (!write.ok) throw new Error('Account creation failed');
    }

    const session = createSession(email);
    const name = String(profile.global_name || profile.username || email.split('@')[0]).slice(0, 100);
    const fragmentValue = fragment({
      discord_session: session,
      discord_login: Buffer.from(email).toString('base64url'),
      discord_user: name,
    });
    return res.redirect(`/app#${fragmentValue}`);
  } catch (err) {
    console.error('Discord OAuth error', err?.message || err);
    return res.redirect('/app?auth_error=discord_failed');
  }
}
