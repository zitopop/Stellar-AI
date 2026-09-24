import { createECDH, createHmac, randomUUID } from 'node:crypto';
import webpush from 'web-push';

const ACTIVE_KEY = 'stellar:inapp-call:active';
const CALL_KEY_PREFIX = 'stellar:inapp-call:';
const PUSH_KEY = 'stellar:inapp-call:push:subscriptions';
const SCHEDULE_KEY = 'stellar:inapp-call:schedules';
const WORKER_LOCK_KEY = 'stellar:inapp-call:worker-lock';
const CALL_TTL_SECONDS = 60 * 10;
const CALL_LIFETIME_MS = 5 * 60 * 1000;
const ACTIVE_STATUSES = new Set(['ringing', 'answered']);
const SCHEDULE_HORIZON_MS = 180 * 24 * 60 * 60 * 1000;
const MAX_PUSH_SUBSCRIPTIONS = 6;
const MAX_SCHEDULES = 80;

function storageConfig() {
  return {
    url: String(process.env.KV_REST_API_URL || '').trim(),
    token: String(process.env.KV_REST_API_TOKEN || '').trim(),
  };
}

function safeText(value, max = 300) {
  return String(value || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function publicCall(call) {
  if (!call || typeof call !== 'object') return null;
  return {
    id: safeText(call.id, 80),
    status: safeText(call.status, 24),
    category: safeText(call.category, 40),
    severity: safeText(call.severity, 24),
    summary: safeText(call.summary, 300),
    createdAt: Number(call.createdAt || 0) || 0,
    answeredAt: Number(call.answeredAt || 0) || null,
    completedAt: Number(call.completedAt || 0) || null,
    expiresAt: Number(call.expiresAt || 0) || 0,
  };
}

function publicSchedule(item) {
  if (!item || typeof item !== 'object') return null;
  return {
    id: safeText(item.id, 80),
    status: safeText(item.status, 24),
    category: safeText(item.category, 40),
    summary: safeText(item.summary, 300),
    scheduledAt: Number(item.scheduledAt || 0) || 0,
    createdAt: Number(item.createdAt || 0) || 0,
    firedAt: Number(item.firedAt || 0) || null,
  };
}

async function kvPipeline(commands) {
  const { url, token } = storageConfig();
  if (!url || !token) throw new Error('Stellar Call storage is unavailable.');
  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(7000),
  });
  const data = await response.json().catch(() => []);
  if (!response.ok) throw new Error('Stellar Call storage request failed.');
  return Array.isArray(data) ? data : [];
}

async function kvGetJson(key) {
  const { url, token } = storageConfig();
  if (!url || !token) return null;
  const response = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(5000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.result == null) return null;
  try { return JSON.parse(data.result); } catch { return data.result; }
}

async function kvSetJson(key, value, ttlSeconds = null) {
  const command = ['SET', key, JSON.stringify(value)];
  if (Number.isFinite(ttlSeconds) && ttlSeconds > 0) command.push('EX', Math.floor(ttlSeconds));
  await kvPipeline([command]);
}

async function writeCall(call) {
  await kvPipeline([
    ['SET', `${CALL_KEY_PREFIX}${call.id}`, JSON.stringify(call), 'EX', CALL_TTL_SECONDS],
    ['SET', ACTIVE_KEY, JSON.stringify(call.id), 'EX', CALL_TTL_SECONDS],
  ]);
  return call;
}

function pushSeed() {
  return String(
    process.env.STELLAR_PUSH_SEED
      || process.env.CALL_BRIDGE_TOKEN
      || process.env.SESSION_SECRET
      || '',
  ).trim();
}

function vapidKeys() {
  const seed = pushSeed();
  if (!seed) return null;
  for (let counter = 0; counter < 8; counter += 1) {
    const privateKey = createHmac('sha256', seed)
      .update(`stellar-web-push-v1:${counter}`)
      .digest();
    try {
      const ecdh = createECDH('prime256v1');
      ecdh.setPrivateKey(privateKey);
      const publicKey = ecdh.getPublicKey();
      return {
        publicKey: publicKey.toString('base64url'),
        privateKey: privateKey.toString('base64url'),
      };
    } catch {}
  }
  return null;
}

function configureWebPush() {
  const keys = vapidKeys();
  if (!keys) return null;
  webpush.setVapidDetails('mailto:support@trystellarai.com', keys.publicKey, keys.privateKey);
  return keys;
}

function normalizeSubscription(input) {
  if (!input || typeof input !== 'object') return null;
  const endpoint = String(input.endpoint || '').trim();
  const p256dh = String(input.keys?.p256dh || '').trim();
  const auth = String(input.keys?.auth || '').trim();
  if (!endpoint.startsWith('https://') || !p256dh || !auth) return null;
  return {
    endpoint: endpoint.slice(0, 1200),
    expirationTime: Number(input.expirationTime || 0) || null,
    keys: { p256dh: p256dh.slice(0, 300), auth: auth.slice(0, 300) },
    updatedAt: Date.now(),
  };
}

async function readPushSubscriptions() {
  const value = await kvGetJson(PUSH_KEY);
  return Array.isArray(value) ? value.filter(Boolean).slice(0, MAX_PUSH_SUBSCRIPTIONS) : [];
}

async function writePushSubscriptions(items) {
  await kvSetJson(PUSH_KEY, items.slice(0, MAX_PUSH_SUBSCRIPTIONS));
}

async function deliverStellarCallPush(call) {
  const keys = configureWebPush();
  if (!keys) return { ok: false, reason: 'push-not-configured', sent: 0 };
  const subscriptions = await readPushSubscriptions();
  if (!subscriptions.length) return { ok: false, reason: 'no-subscriptions', sent: 0 };
  const payload = JSON.stringify({
    type: 'stellar-call',
    title: 'Jarvis is calling',
    body: call.summary || 'Stellar AI needs your attention.',
    callId: call.id,
    summary: call.summary || '',
  });
  const keep = [];
  let sent = 0;
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(subscription, payload, {
        TTL: 300,
        urgency: 'high',
        topic: `stellar-call-${String(call.id || '').slice(0, 24)}`,
      });
      keep.push(subscription);
      sent += 1;
    } catch (error) {
      const status = Number(error?.statusCode || error?.status || 0);
      if (![404, 410].includes(status)) keep.push(subscription);
      console.error('Stellar Call push failed', status || '', error?.message || error);
    }
  }
  if (keep.length !== subscriptions.length) await writePushSubscriptions(keep).catch(() => {});
  return { ok: sent > 0, sent };
}

export function stellarCallConfigured() {
  const { url, token } = storageConfig();
  return Boolean(url && token);
}

export function stellarPushConfigured() {
  return Boolean(stellarCallConfigured() && vapidKeys());
}

export function stellarPushPublicKey() {
  return vapidKeys()?.publicKey || '';
}

export async function saveStellarPushSubscription(subscription) {
  if (!stellarPushConfigured()) return { ok: false, reason: 'push-not-configured' };
  const normalized = normalizeSubscription(subscription);
  if (!normalized) return { ok: false, reason: 'invalid-subscription' };
  const current = await readPushSubscriptions();
  const withoutDuplicate = current.filter((item) => item.endpoint !== normalized.endpoint);
  await writePushSubscriptions([normalized, ...withoutDuplicate]);
  return { ok: true };
}

export async function createStellarCallSession({
  category = 'owner',
  severity = 'urgent',
  summary = 'Jarvis needs your attention.',
  metadata = {},
} = {}) {
  if (!stellarCallConfigured()) return { ok: false, reason: 'storage' };
  const now = Date.now();
  const call = {
    id: randomUUID(),
    status: 'ringing',
    category: safeText(category, 40) || 'owner',
    severity: safeText(severity, 24) || 'urgent',
    summary: safeText(summary, 300) || 'Jarvis needs your attention.',
    createdAt: now,
    expiresAt: now + CALL_LIFETIME_MS,
    metadata: metadata && typeof metadata === 'object' ? metadata : {},
  };
  await writeCall(call);
  const push = await deliverStellarCallPush(call).catch(() => ({ ok: false, sent: 0 }));
  return { ok: true, call: publicCall(call), push };
}

export async function getStellarCall(callId) {
  const id = safeText(callId, 80);
  if (!id) return null;
  const call = await kvGetJson(`${CALL_KEY_PREFIX}${id}`);
  return call && typeof call === 'object' ? call : null;
}

export async function getActiveStellarCall() {
  const activeId = await kvGetJson(ACTIVE_KEY);
  if (!activeId) return null;
  const call = await getStellarCall(activeId);
  if (!call) return null;
  if (Number(call.expiresAt || 0) <= Date.now()) {
    if (ACTIVE_STATUSES.has(call.status)) await updateStellarCall(call.id, 'expired').catch(() => {});
    return null;
  }
  if (!ACTIVE_STATUSES.has(call.status)) return null;
  return publicCall(call);
}

export async function updateStellarCall(callId, nextStatus) {
  const id = safeText(callId, 80);
  const status = safeText(nextStatus, 24).toLowerCase();
  if (!id || !['ringing', 'answered', 'declined', 'completed', 'expired'].includes(status)) {
    throw new Error('Invalid Stellar Call update.');
  }
  const call = await getStellarCall(id);
  if (!call) return { ok: false, reason: 'not-found' };
  const now = Date.now();
  const updated = {
    ...call,
    status,
    ...(status === 'answered' && !call.answeredAt ? { answeredAt: now } : {}),
    ...(['declined', 'completed', 'expired'].includes(status) ? { completedAt: now } : {}),
  };
  const commands = [
    ['SET', `${CALL_KEY_PREFIX}${id}`, JSON.stringify(updated), 'EX', CALL_TTL_SECONDS],
  ];
  if (ACTIVE_STATUSES.has(status)) {
    commands.push(['SET', ACTIVE_KEY, JSON.stringify(id), 'EX', CALL_TTL_SECONDS]);
  } else {
    const activeId = await kvGetJson(ACTIVE_KEY);
    if (activeId === id) commands.push(['DEL', ACTIVE_KEY]);
  }
  await kvPipeline(commands);
  return { ok: true, call: publicCall(updated) };
}

async function readSchedules() {
  const value = await kvGetJson(SCHEDULE_KEY);
  return Array.isArray(value) ? value.filter(Boolean).slice(0, MAX_SCHEDULES) : [];
}

async function writeSchedules(items) {
  const sorted = items
    .filter(Boolean)
    .sort((a, b) => Number(a.scheduledAt || 0) - Number(b.scheduledAt || 0))
    .slice(0, MAX_SCHEDULES);
  await kvSetJson(SCHEDULE_KEY, sorted);
}

export async function scheduleStellarCall({
  category = 'reminder',
  summary = '',
  scheduledAt,
} = {}) {
  if (!stellarCallConfigured()) return { ok: false, reason: 'storage' };
  const when = Number(scheduledAt || 0);
  const now = Date.now();
  if (!Number.isFinite(when) || when < now + 20_000 || when > now + SCHEDULE_HORIZON_MS) {
    return { ok: false, reason: 'invalid-time' };
  }
  const item = {
    id: randomUUID(),
    status: 'scheduled',
    category: ['meeting', 'reminder', 'approval', 'personal'].includes(String(category || '').toLowerCase())
      ? String(category).toLowerCase()
      : 'reminder',
    summary: safeText(summary, 300) || 'Jarvis reminder.',
    scheduledAt: Math.floor(when),
    createdAt: now,
  };
  const current = await readSchedules();
  await writeSchedules([...current.filter((entry) => entry.status === 'scheduled'), item]);
  return { ok: true, schedule: publicSchedule(item) };
}

export async function listStellarCallSchedules() {
  const now = Date.now() - 24 * 60 * 60 * 1000;
  const current = await readSchedules();
  return current
    .filter((item) => item.status === 'scheduled' || Number(item.firedAt || 0) >= now)
    .map(publicSchedule)
    .filter(Boolean);
}

export async function cancelStellarCallSchedule(scheduleId) {
  const id = safeText(scheduleId, 80);
  if (!id) return { ok: false, reason: 'invalid-id' };
  const current = await readSchedules();
  const found = current.find((item) => item.id === id && item.status === 'scheduled');
  if (!found) return { ok: false, reason: 'not-found' };
  const next = current.map((item) => item.id === id ? { ...item, status: 'cancelled', completedAt: Date.now() } : item);
  await writeSchedules(next);
  return { ok: true };
}

async function acquireWorkerLock() {
  const result = await kvPipeline([
    ['SET', WORKER_LOCK_KEY, String(Date.now()), 'NX', 'EX', 50],
  ]);
  const first = result?.[0];
  return first?.result === 'OK' || first === 'OK';
}

export async function processDueStellarCalls() {
  if (!stellarCallConfigured()) return { ok: false, reason: 'storage' };
  if (!await acquireWorkerLock()) return { ok: true, skipped: 'locked' };
  const now = Date.now();
  const current = await readSchedules();
  const due = current
    .filter((item) => item.status === 'scheduled' && Number(item.scheduledAt || 0) <= now + 30_000)
    .sort((a, b) => Number(a.scheduledAt || 0) - Number(b.scheduledAt || 0));
  if (!due.length) return { ok: true, fired: 0 };
  const nextItem = due[0];
  const created = await createStellarCallSession({
    category: nextItem.category || 'reminder',
    severity: nextItem.category === 'meeting' ? 'important' : 'info',
    summary: nextItem.summary || 'Jarvis reminder.',
    metadata: { trigger: 'scheduled-stellar-call', scheduleId: nextItem.id },
  });
  if (!created.ok) return { ok: false, reason: created.reason || 'call-create-failed' };
  const next = current.map((item) => item.id === nextItem.id
    ? { ...item, status: 'fired', firedAt: Date.now(), callId: created.call?.id || null }
    : item);
  await writeSchedules(next);
  return { ok: true, fired: 1, call: created.call, push: created.push };
}
