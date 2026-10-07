// api/auth.js — email/password and verified Google sign-in for Stellar AI
import crypto from 'crypto';
import { createSession, readSession, sessionSigningConfigured } from '../lib/auth.js';
import { applyReferralReward, ensureReferralProfile, kvGet, kvPipeline, kvSet } from '../lib/profile.js';
import { initialFunnelState, recordFunnelSignup } from '../lib/funnel-metrics.js';
import { escapeEmailHtml, resendSender, SUPPORT_EMAIL } from '../lib/email-config.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '308347075858-9eu0dootm325qgq7hba7qsnnchmcke1r.apps.googleusercontent.com';
const WELCOME_CREDITS = 100;

function setCors(req, res) {
  const origin = req.headers.origin || '';
  const allowed = /^https:\/\/(?:[a-z0-9-]+\.)?trystellarai\.com$/i.test(origin)
    || /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin)
    || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : 'https://trystellarai.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function cleanName(value, max = 60) {
  return String(value || '').replace(/[\u0000-\u001F\u007F]/g, '').trim().replace(/\s+/g, ' ').slice(0, max);
}

function publicAccountUser(user, email, source = '') {
  const firstName = cleanName(user?.firstName || user?.given_name || '');
  const lastName = cleanName(user?.lastName || user?.family_name || '');
  const name = cleanName([firstName, lastName].filter(Boolean).join(' ') || user?.name || '');
  return {
    email: String(email || user?.loginEmail || '').trim().toLowerCase(),
    firstName,
    lastName,
    name,
    signInSource: String(source || user?.signInSource || '').trim().toLowerCase() || 'account',
    ...(String(user?.picture || '').startsWith('https://') ? { picture: String(user.picture).slice(0, 500) } : {}),
  };
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(String(password), salt, 150000, 32, 'sha256').toString('hex');
}

function authClientKey(req, email = '') {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = forwarded || String(req.headers['x-real-ip'] || 'unknown');
  return crypto.createHash('sha256').update(ip + '|' + String(email || '').toLowerCase().trim()).digest('hex').slice(0, 24);
}

async function allowAuthAttempt(url, token, req, action, email = '') {
  const limits = { login: 10, signup: 6, googleLogin: 20, redeemCode: 10 };
  const limit = limits[action];
  if (!limit) return true;
  const bucket = Math.floor(Date.now() / 60_000);
  const key = `stellar:auth-rate:${action}:${bucket}:${authClientKey(req, email)}`;
  const result = await kvPipeline(url, token, [['INCR', key], ['EXPIRE', key, 120, 'NX']]);
  const count = Math.max(0, Number(Array.isArray(result) ? result[0]?.result : 0) || 0);
  return count <= limit;
}

function decodeBase64Url(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

async function verifyGoogleCredential(token) {
  const [headerPart, payloadPart, signaturePart] = String(token || '').split('.');
  if (!headerPart || !payloadPart || !signaturePart) throw new Error('Invalid Google sign-in response.');

  const header = decodeBase64Url(headerPart);
  const payload = decodeBase64Url(payloadPart);
  const now = Math.floor(Date.now() / 1000);
  const issuerOk = payload.iss === 'https://accounts.google.com' || payload.iss === 'accounts.google.com';

  if (header.alg !== 'RS256' || !header.kid || !issuerOk || payload.aud !== GOOGLE_CLIENT_ID || !payload.email_verified || payload.exp <= now) {
    throw new Error('Google sign-in could not be verified.');
  }

  const certResponse = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  if (!certResponse.ok) throw new Error('Could not verify Google sign-in.');
  const keys = await certResponse.json();
  const jwk = keys.keys?.find((key) => key.kid === header.kid);
  if (!jwk) throw new Error('Google signing key was not found. Please try again.');

  const key = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const verified = crypto.verify(
    'RSA-SHA256',
    Buffer.from(`${headerPart}.${payloadPart}`),
    key,
    Buffer.from(signaturePart, 'base64url'),
  );
  if (!verified || !validEmail(String(payload.email || '').toLowerCase().trim())) {
    throw new Error('Google sign-in could not be verified.');
  }

  return {
    email: String(payload.email).toLowerCase().trim(),
    name: String(payload.name || payload.given_name || '').slice(0, 100),
    firstName: cleanName(payload.given_name || ''),
    lastName: cleanName(payload.family_name || ''),
    picture: String(payload.picture || '').slice(0, 500),
  };
}

async function sendWelcomeEmail(email, requestedName = '') {
  const apiKey = process.env.RESEND_API_KEY;
  const from = resendSender();
  if (!apiKey || !from) {
    console.warn('Welcome email skipped: RESEND_API_KEY or RESEND_FROM_EMAIL is not configured.');
    return false;
  }
  const displayName = String(requestedName || email.split('@')[0].replace(/[._-]+/g, ' ')).slice(0, 100);
  const safeName = escapeEmailHtml(displayName);
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [email],
        subject: 'Welcome to Stellar AI',
        reply_to: SUPPORT_EMAIL,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#09090b;color:#f4f4f5;line-height:1.6;">
          <div style="font-size:20px;font-weight:900;margin-bottom:24px;">✦ Stellar AI</div>
          <h1 style="font-size:26px;line-height:1.15;margin:0 0 12px;">Welcome, ${safeName}.</h1>
          <p style="color:#d4d4d8;">Stellar AI helps you ask, plan, write, debug, organise and improve real projects from one clean workspace.</p>
          <p style="color:#61e6bf;font-weight:800;">Your ${WELCOME_CREDITS} welcome Stellar Credits are ready.</p>
          <h2 style="font-size:16px;margin:24px 0 8px;">Start with one useful task</h2>
          <ol style="padding-left:22px;color:#d4d4d8;"><li>Open <a href="https://trystellarai.com/app?welcome=1" style="color:#61e6bf;">Stellar AI</a>.</li><li>Ask for something specific, like a website fix, email reply, code explanation, or FiveM/Roblox plan.</li><li>Review the result before publishing or running anything important.</li></ol>
          <a href="https://trystellarai.com/app?welcome=1" style="display:block;text-align:center;background:#61e6bf;color:#061c16;font-weight:900;padding:14px 18px;border-radius:10px;text-decoration:none;margin-top:24px;">Open Stellar AI →</a>
          <p style="color:#71717a;font-size:12px;text-align:center;margin-top:28px;">— The Stellar AI Team · <a href="mailto:${SUPPORT_EMAIL}" style="color:#a1a1aa;">${SUPPORT_EMAIL}</a></p>
        </div>`,
      }),
    });
    if (!response.ok) {
      console.warn('Welcome email provider rejected the message.');
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function ensureUser(url, token, email, source, identity = {}) {
  const userKey = `stellar:user:${email}`;
  const existing = await kvGet(url, token, userKey);
  if (existing) {
    const patch = {};
    if (!existing.signInSource && source) patch.signInSource = source;
    if (!existing.loginEmail) patch.loginEmail = String(email || '').toLowerCase().trim();
    if (!existing.firstName && identity.firstName) patch.firstName = cleanName(identity.firstName);
    if (!existing.lastName && identity.lastName) patch.lastName = cleanName(identity.lastName);
    if (!existing.picture && /^https:\/\//i.test(String(identity.picture || ''))) patch.picture = String(identity.picture).slice(0, 500);
    const base = Object.keys(patch).length ? { ...existing, ...patch, updatedAt: Date.now() } : existing;
    if (base !== existing) await kvSet(url, token, userKey, base);
    const user = await ensureReferralProfile(url, token, email, base);
    return { user, isNew: false };
  }

  const user = {
    plan: 'free',
    walletPence: WELCOME_CREDITS,
    welcomeCreditGiven: true,
    welcomeCreditAt: Date.now(),
    createdAt: Date.now(),
    signInSource: source,
    loginEmail: String(email || '').toLowerCase().trim(),
    firstName: cleanName(identity.firstName || ''),
    lastName: cleanName(identity.lastName || ''),
    ...( /^https:\/\//i.test(String(identity.picture || '')) ? { picture: String(identity.picture).slice(0, 500) } : {} ),
    funnel: initialFunnelState(),
  };
  await kvSet(url, token, userKey, user);
  const profile = await ensureReferralProfile(url, token, email, user);
  return { user: profile, isNew: true };
}

async function awardReferralIfEligible(url, token, email, referralCode, isNew) {
  if (!isNew || !referralCode) return null;
  try {
    return await applyReferralReward(url, token, email, referralCode);
  } catch (error) {
    console.error('Referral reward failed', error?.message || error);
    return null;
  }
}

async function handleWelcomeResend(req, res, url, token) {
  const session = readSession(req);
  if (!session) return res.status(401).json({ error: 'Please sign in again to continue.' });

  const { email, name } = req.body || {};
  const accountUser = (await kvGet(url, token, `stellar:user:${session.email}`)) || {};
  const loginEmail = String(accountUser.loginEmail || session.email).trim().toLowerCase();
  const normalizedEmail = String(email || loginEmail).trim().toLowerCase();
  if (!normalizedEmail || normalizedEmail !== loginEmail) {
    return res.status(403).json({ error: 'You can only send a welcome email to your signed-in account.' });
  }

  const bucket = Math.floor(Date.now() / (10 * 60 * 1000));
  const rateKey = `stellar:welcome-email-rate:${bucket}:${normalizedEmail}`;
  const rateResult = await kvPipeline(url, token, [['INCR', rateKey], ['EXPIRE', rateKey, 1200, 'NX']]);
  const rateCount = Math.max(0, Number(Array.isArray(rateResult) ? rateResult[0]?.result : 0) || 0);
  if (rateCount > 1) {
    res.setHeader('Retry-After', '600');
    return res.status(429).json({ error: 'A welcome email was already requested recently. Try again later.' });
  }

  const sent = await sendWelcomeEmail(normalizedEmail, name);
  if (!sent) return res.status(503).json({ error: 'Email delivery is not configured or temporarily unavailable.' });
  return res.status(200).json({ success: true });
}

async function handleProfileUpdate(req, res, url, token) {
  const session = readSession(req);
  if (!session) return res.status(401).json({ error: 'Please sign in again to continue.' });

  const accountEmail = String(session.email || '').trim().toLowerCase();
  const userKey = `stellar:user:${accountEmail}`;
  const user = (await kvGet(url, token, userKey)) || { createdAt: Date.now(), signInSource: 'account' };
  const currentLoginEmail = String(user.loginEmail || accountEmail).trim().toLowerCase();
  const requestedEmail = String(req.body?.newEmail || currentLoginEmail).trim().toLowerCase();
  const firstName = cleanName(req.body?.firstName || '');
  const lastName = cleanName(req.body?.lastName || '');
  const currentPassword = String(req.body?.currentPassword || '');

  if (!firstName) return res.status(400).json({ error: 'Enter your first name.' });
  if (firstName.length > 60 || lastName.length > 60) return res.status(400).json({ error: 'Name is too long.' });
  if (!validEmail(requestedEmail)) return res.status(400).json({ error: 'Enter a valid email address.' });

  const currentAuthKey = `stellar:auth:${currentLoginEmail}`;
  const authRecord = await kvGet(url, token, currentAuthKey);
  const passwordAccount = Boolean(authRecord?.salt && authRecord?.hash);
  const emailChanging = requestedEmail !== currentLoginEmail;

  if (emailChanging) {
    if (!passwordAccount) {
      return res.status(400).json({ error: 'This account uses Google sign-in. Change the Google account email with Google, then sign in again.' });
    }
    if (!currentPassword || currentPassword.length < 8) {
      return res.status(400).json({ error: 'Enter your current password to change your email.' });
    }
    const candidate = Buffer.from(hashPassword(currentPassword, authRecord.salt), 'hex');
    const stored = Buffer.from(authRecord.hash, 'hex');
    if (candidate.length !== stored.length || !crypto.timingSafeEqual(candidate, stored)) {
      return res.status(403).json({ error: 'Current password is incorrect.' });
    }
    const nextAuthKey = `stellar:auth:${requestedEmail}`;
    const taken = await kvGet(url, token, nextAuthKey);
    if (taken) return res.status(409).json({ error: 'That email is already in use.' });

    await kvPipeline(url, token, [
      ['SET', nextAuthKey, JSON.stringify({ ...authRecord, accountEmail, emailChangedAt: Date.now() })],
      ['DEL', currentAuthKey],
    ]);
  }

  const updated = {
    ...user,
    firstName,
    lastName,
    name: [firstName, lastName].filter(Boolean).join(' '),
    loginEmail: requestedEmail,
    signInSource: passwordAccount ? 'password' : String(user.signInSource || 'google'),
    updatedAt: Date.now(),
  };
  await kvSet(url, token, userKey, updated);

  return res.status(200).json({
    ok: true,
    emailChanged: emailChanging,
    user: publicAccountUser(updated, requestedEmail, updated.signInSource),
    session: createSession(accountEmail),
  });
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET' && String(req.query?.mode || '') === 'session-health') {
    const ready = sessionSigningConfigured();
    return res.status(ready ? 200 : 503).json({ ok: ready, ready, service: 'session-signing' });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  if (req.body?.action === 'sessionHealth') {
    const ready = sessionSigningConfigured();
    return res.status(ready ? 200 : 503).json({ ok: ready, ready, service: 'session-signing' });
  }

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return res.status(500).json({ error: 'Account storage is not configured.' });

  if (String(req.query?.mode || '') === 'send-welcome') return handleWelcomeResend(req, res, url, token);

  if (req.body?.action === 'updateProfile') return handleProfileUpdate(req, res, url, token);

  const { action, email, password, credential, code, referralCode } = req.body || {};
  const actionName = String(action || '').trim();
  const rateEmail = String(email || '').toLowerCase().trim();
  try {
    if (!(await allowAuthAttempt(url, token, req, actionName, rateEmail))) {
      res.setHeader('Retry-After', '60');
      return res.status(429).json({ error: 'Too many account attempts. Wait a minute and try again.' });
    }

    if (action === 'googleLogin') {
      const googleUser = await verifyGoogleCredential(credential);
      const { user, isNew } = await ensureUser(url, token, googleUser.email, 'google', googleUser);
      const referral = await awardReferralIfEligible(url, token, googleUser.email, referralCode, isNew);
      if (isNew) {
        void sendWelcomeEmail(googleUser.email, googleUser.name);
        void recordFunnelSignup({ url, token, email: googleUser.email });
      }
      return res.status(200).json({ ok: true, user: publicAccountUser({ ...user, picture: user.picture || googleUser.picture }, googleUser.email, 'google'), session: createSession(googleUser.email), isNew, referralAwarded: Boolean(referral?.applied) });
    }

    if (action === 'refreshSession') {
      const session = readSession(req);
      if (!session) return res.status(401).json({ error: 'Please sign in again to continue.' });
      const user = (await kvGet(url, token, `stellar:user:${session.email}`)) || {};
      const loginEmail = String(user.loginEmail || session.email).trim().toLowerCase();
      return res.status(200).json({ ok: true, email: loginEmail, user: publicAccountUser(user, loginEmail, user.signInSource), session: createSession(session.email) });
    }

    const normalizedEmail = String(email || '').toLowerCase().trim();
    if (!validEmail(normalizedEmail)) return res.status(400).json({ error: 'Enter a valid email address.' });

    if (action === 'redeemCode') {
      const session = readSession(req);
      if (!session) return res.status(401).json({ error: 'Please sign in again before redeeming a code.' });
      const accountUser = (await kvGet(url, token, `stellar:user:${session.email}`)) || {};
      const loginEmail = String(accountUser.loginEmail || session.email).trim().toLowerCase();
      if (normalizedEmail !== loginEmail) return res.status(401).json({ error: 'Please sign in again before redeeming a code.' });
      const normalizedCode = String(code || '').trim().toUpperCase();
      if (!/^STELLAR-[A-Z0-9-]{6,64}$/.test(normalizedCode)) return res.status(400).json({ error: 'That code is not valid.' });

      const codeKey = `stellar:code:${normalizedCode}`;
      const gift = await kvGet(url, token, codeKey);
      if (!gift || gift.used || !Number.isFinite(Number(gift.amount)) || Number(gift.amount) <= 0) {
        return res.status(400).json({ error: 'That code is invalid or has already been used.' });
      }

      const userKey = `stellar:user:${session.email}`;
      const existing = (await kvGet(url, token, userKey)) || { plan: 'free', createdAt: Date.now(), loginEmail };
      const amount = Math.round(Number(gift.amount));
      const updatedUser = {
        ...existing,
        walletPence: Math.max(0, Number(existing.walletPence) || 0) + amount,
        updatedAt: Date.now(),
      };
      const updatedGift = { ...gift, used: true, usedBy: normalizedEmail, usedAt: Date.now() };
      await Promise.all([
        kvSet(url, token, userKey, updatedUser),
        kvSet(url, token, codeKey, updatedGift),
      ]);
      return res.status(200).json({ ok: true, walletPence: updatedUser.walletPence, amount });
    }

    if (action !== 'signup' && action !== 'login') return res.status(400).json({ error: 'Unknown action.' });
    if (!password || String(password).length < 8) return res.status(400).json({ error: 'Password needs to be at least 8 characters.' });
    if (String(password).length > 100) return res.status(400).json({ error: 'Password is too long.' });

    const authKey = `stellar:auth:${normalizedEmail}`;
    const existingAuth = await kvGet(url, token, authKey);

    if (action === 'signup') {
      if (existingAuth) return res.status(409).json({ error: 'That email already has an account. Try signing in instead.' });
      const salt = crypto.randomBytes(16).toString('hex');
      await kvSet(url, token, authKey, { salt, hash: hashPassword(password, salt), accountEmail: normalizedEmail, createdAt: Date.now() });
      const { user, isNew } = await ensureUser(url, token, normalizedEmail, 'password');
      const referral = await awardReferralIfEligible(url, token, normalizedEmail, referralCode, isNew);
      void sendWelcomeEmail(normalizedEmail);
      void recordFunnelSignup({ url, token, email: normalizedEmail });
      return res.status(200).json({ ok: true, email: normalizedEmail, user: publicAccountUser(user, normalizedEmail, 'password'), session: createSession(normalizedEmail), referralAwarded: Boolean(referral?.applied) });
    }

    if (!existingAuth) return res.status(404).json({ error: 'No account found with that email. Create one first.' });
    const candidate = Buffer.from(hashPassword(password, existingAuth.salt), 'hex');
    const stored = Buffer.from(existingAuth.hash, 'hex');
    if (candidate.length !== stored.length || !crypto.timingSafeEqual(candidate, stored)) {
      return res.status(403).json({ error: 'Wrong password.' });
    }

    const accountEmail = String(existingAuth.accountEmail || normalizedEmail).trim().toLowerCase();
    const accountUser = (await kvGet(url, token, `stellar:user:${accountEmail}`)) || {};
    return res.status(200).json({ ok: true, email: normalizedEmail, user: publicAccountUser({ ...accountUser, loginEmail: normalizedEmail }, normalizedEmail, 'password'), session: createSession(accountEmail) });
  } catch (error) {
    const message = String(error?.message || error || '');
    console.error('Authentication error', message);
    if (/AUTH_SESSION_SECRET is not configured/i.test(message)) {
      return res.status(503).json({ error: 'Secure sign-in is temporarily unavailable. Try again shortly.', code: 'AUTH_SESSION_UNAVAILABLE' });
    }
    return res.status(500).json({ error: message || 'Could not reach the account service. Try again.' });
  }
}