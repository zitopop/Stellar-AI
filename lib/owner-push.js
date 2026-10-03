import { createHash } from 'node:crypto';
import webPush from 'web-push';

const SUB_PREFIX = 'stellar:owner-push:sub:';
const SUB_TTL_SECONDS = 60 * 60 * 24 * 90;

function kvConfig() {
  return {
    url: String(process.env.KV_REST_API_URL || '').replace(/\/$/, ''),
    token: String(process.env.KV_REST_API_TOKEN || ''),
  };
}

function vapidConfig() {
  return {
    subject: String(process.env.WEB_PUSH_SUBJECT || process.env.VAPID_SUBJECT || 'mailto:support@trystellarai.com').trim(),
    publicKey: String(process.env.WEB_PUSH_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || '').trim(),
    privateKey: String(process.env.WEB_PUSH_PRIVATE_KEY || process.env.VAPID_PRIVATE_KEY || '').trim(),
  };
}

function hash(value) {
  return createHash('sha256').update(String(value || '')).digest('hex').slice(0, 32);
}

function configuredKv() {
  const { url, token } = kvConfig();
  return Boolean(url && token);
}

export function ownerPushConfigured() {
  const vapid = vapidConfig();
  return configuredKv() && Boolean(vapid.publicKey && vapid.privateKey && vapid.subject);
}

export function getOwnerPushPublicKey() {
  return vapidConfig().publicKey || '';
}

function cleanSubscription(input) {
  const subscription = input && typeof input === 'object' ? input : {};
  const endpoint = String(subscription.endpoint || '').trim();
  const keys = subscription.keys && typeof subscription.keys === 'object' ? subscription.keys : {};
  const p256dh = String(keys.p256dh || '').trim();
  const auth = String(keys.auth || '').trim();
  if (!/^https:\/\//i.test(endpoint) || !p256dh || !auth) return null;
  return { endpoint, expirationTime: subscription.expirationTime || null, keys: { p256dh, auth } };
}

async function kvPipeline(commands) {
  const { url, token } = kvConfig();
  if (!url || !token) throw new Error('Push subscription storage is unavailable.');
  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(8000),
  });
  const data = await response.json().catch(() => []);
  if (!response.ok) throw new Error('Push subscription storage request failed.');
  return Array.isArray(data) ? data : [];
}

async function kvKeys(pattern) {
  const { url, token } = kvConfig();
  if (!url || !token) return [];
  const response = await fetch(`${url}/keys/${pattern}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return [];
  return Array.isArray(data?.result) ? data.result.map(String) : [];
}

function configureWebPush() {
  const vapid = vapidConfig();
  if (!vapid.publicKey || !vapid.privateKey) throw new Error('Web Push VAPID keys are not configured.');
  webPush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
}

export async function saveOwnerPushSubscription({ email, subscription, userAgent = '' }) {
  const clean = cleanSubscription(subscription);
  if (!clean) return { ok: false, saved: false, reason: 'invalid-subscription' };
  if (!configuredKv()) return { ok: false, saved: false, reason: 'storage' };
  const emailHash = hash(String(email || 'owner').toLowerCase());
  const endpointHash = hash(clean.endpoint);
  const key = `${SUB_PREFIX}${emailHash}:${endpointHash}`;
  await kvPipeline([
    ['SET', key, JSON.stringify({ subscription: clean, emailHash, endpointHash, userAgent: String(userAgent || '').slice(0, 240), createdAt: Date.now() }), 'EX', SUB_TTL_SECONDS],
  ]);
  return { ok: true, saved: true, endpointHash };
}

export async function sendOwnerPushAlert({ category = 'owner', severity = 'urgent', summary = '', reason = '', call = null } = {}) {
  if (!ownerPushConfigured()) return { ok: true, sent: 0, failed: 0, reason: 'not-configured' };
  configureWebPush();
  const keys = await kvKeys(`${SUB_PREFIX}*`);
  if (!keys.length) return { ok: true, sent: 0, failed: 0, reason: 'no-subscriptions' };
  const rows = await kvPipeline(keys.map((key) => ['GET', key]));
  const payload = JSON.stringify({
    title: severity === 'critical' ? 'Jarvis critical call' : 'Jarvis needs you',
    body: `${String(category).toUpperCase()}: ${String(summary || 'Stellar AI needs your attention.').slice(0, 140)}`,
    category,
    severity,
    summary: String(summary || '').slice(0, 300),
    reason: String(reason || '').slice(0, 220),
    callId: call?.id || '',
    id: call?.id || '',
    url: '/app?stellarCall=1',
  });
  let sent = 0;
  let failed = 0;
  const stale = [];
  for (let index = 0; index < keys.length; index += 1) {
    let parsed = null;
    try { parsed = JSON.parse(rows[index]?.result || '{}'); } catch {}
    const subscription = parsed?.subscription;
    if (!subscription?.endpoint) continue;
    try {
      await webPush.sendNotification(subscription, payload, { TTL: 300, urgency: 'high' });
      sent += 1;
    } catch (error) {
      failed += 1;
      if ([404, 410].includes(Number(error?.statusCode))) stale.push(keys[index]);
      console.error('Owner push alert failed', error?.statusCode || '', error?.message || error);
    }
  }
  if (stale.length) await kvPipeline(stale.map((key) => ['DEL', key])).catch(() => {});
  return { ok: true, sent, failed, stale: stale.length };
}
