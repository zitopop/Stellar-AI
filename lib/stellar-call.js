import { randomUUID } from 'node:crypto';

const ACTIVE_KEY = 'stellar:inapp-call:active';
const CALL_KEY_PREFIX = 'stellar:inapp-call:';
const CALL_TTL_SECONDS = 60 * 10;
const CALL_LIFETIME_MS = 5 * 60 * 1000;
const ACTIVE_STATUSES = new Set(['ringing', 'answered']);

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

async function writeCall(call) {
  await kvPipeline([
    ['SET', `${CALL_KEY_PREFIX}${call.id}`, JSON.stringify(call), 'EX', CALL_TTL_SECONDS],
    ['SET', ACTIVE_KEY, JSON.stringify(call.id), 'EX', CALL_TTL_SECONDS],
  ]);
  return call;
}

export function stellarCallConfigured() {
  const { url, token } = storageConfig();
  return Boolean(url && token);
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
  return { ok: true, call: publicCall(call) };
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
