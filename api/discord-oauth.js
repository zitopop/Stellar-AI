// api/discord-oauth.js — Discord OAuth callback with signed Stellar session
import crypto from 'crypto';
import { createSession } from '../lib/auth.js';
import { applyReferralReward, ensureReferralProfile, kvGet, kvPipeline, validReferralCode } from '../lib/profile.js';
import { initialFunnelState, recordFunnelSignup } from '../lib/funnel-metrics.js';

function fragment(values) {
  return new URLSearchParams(values).toString();
}

function stateSecret() {
  return process.env.DISCORD_STATE_SECRET || process.env.AUTH_SESSION_SECRET || process.env.OWNER_SECRET || '';
}

function createState(referralCode) {
  const secret = stateSecret();
  if (!secret) return '';
  const payload = Buffer.from(JSON.stringify({
    ref: validReferralCode(referralCode) ? String(referralCode).toUpperCase() : '',
    exp: Date.now() + (10 * 60 * 1000),
    nonce: crypto.randomBytes(12).toString('base64url'),
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function readState(state) {
  const secret = stateSecret();
  const [payload, signature] = String(state || '').split('.');
  if (!secret || !payload || !signature) return '';
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const actual = Buffer.from(expected);
  const provided = Buffer.from(signature);
  if (actual.length !== provided.length || !crypto.timingSafeEqual(actual, provided)) return '';
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return decoded?.exp > Date.now() && validReferralCode(decoded?.ref) ? decoded.ref : '';
  } catch {
    return '';
  }
}

export default async function handler(req, res) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI || 'https://trystellarai.com/api/discord-oauth';
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  const { code, error, state, ref } = req.query;

  if (!code && !error) {
    if (!clientId) return res.status(500).json({ error: 'Discord is not configured.' });
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'identify email',
    });
    const signedState = createState(ref);
    if (signedState) params.set('state', signedState);
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
    const existingAuth = await kvGet(kvUrl, kvToken, authKey);
    let isNew = false;
    let user;

    if (!existingAuth) {
      isNew = true;
      const now = Date.now();
      const authRecord = { discord: true, discordId: profile.id, discordUsername: profile.username, createdAt: now };
      user = { plan: 'free', walletPence: 100, welcomeCreditGiven: true, welcomeCreditAt: now, createdAt: now, signInSource: 'discord', funnel: initialFunnelState(now) };
      await kvPipeline(kvUrl, kvToken, [
        ['SET', authKey, JSON.stringify(authRecord)],
        ['SET', userKey, JSON.stringify(user)],
      ]);
    } else {
      user = await kvGet(kvUrl, kvToken, userKey) || { plan: 'free', createdAt: Date.now(), signInSource: 'discord' };
    }

    user = await ensureReferralProfile(kvUrl, kvToken, email, user);
    const referralCode = readState(state);
    if (isNew && referralCode) {
      try { await applyReferralReward(kvUrl, kvToken, email, referralCode); } catch (error) { console.error('Discord referral reward failed', error?.message || error); }
    }

    if (isNew) void recordFunnelSignup({ url: kvUrl, token: kvToken, email });
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
