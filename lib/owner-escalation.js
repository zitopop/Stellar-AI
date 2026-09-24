const DOMAIN = 'https://trystellarai.com';
const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const CALL_TOKEN = process.env.CALL_BRIDGE_TOKEN;

async function kvGet(key) {
  if (!KV_URL || !KV_TOKEN) return null;
  try {
    const response = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const data = await response.json().catch(() => ({}));
    return data?.result ? JSON.parse(data.result) : null;
  } catch { return null; }
}

async function kvSet(key, value, ttlSeconds = 600) {
  if (!KV_URL || !KV_TOKEN) return false;
  try {
    const command = ['SET', key, JSON.stringify(value), 'EX', ttlSeconds];
    const response = await fetch(`${KV_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([command]),
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch { return false; }
}
export async function escalateOwner({ category, severity = 'urgent', summary, metadata = {} }) {
  if (!CALL_TOKEN) return { ok: false, called: false, reason: 'not-configured' };
  try {
    const response = await fetch(`${DOMAIN}/api/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-call-bridge-token': CALL_TOKEN },
      body: JSON.stringify({ action: 'escalateOwner', category, severity, summary, metadata }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json().catch(() => ({}));
    return response.ok ? data : { ok: false, called: false, reason: data?.error || 'request-failed' };
  } catch (error) {
    console.error('Owner escalation transport failed', error?.message || error);
    return { ok: false, called: false, reason: 'transport' };
  }
}

export async function recordRepeatedServiceFailure({ key, summary, threshold = 3, windowSeconds = 300 }) {
  if (!KV_URL || !KV_TOKEN) return { ok: false, called: false, reason: 'storage' };
  const safeKey = String(key || 'service').replace(/[^a-z0-9:_-]/gi, '').slice(0, 80) || 'service';
  const storeKey = `stellar:owner-call:service-failure:${safeKey}`;
  const now = Date.now();
  const previous = (await kvGet(storeKey)) || {};
  const startedAt = Number(previous.startedAt || 0);
  const activeWindow = startedAt && now - startedAt < windowSeconds * 1000;
  const next = { startedAt: activeWindow ? startedAt : now, count: activeWindow ? Number(previous.count || 0) + 1 : 1 };
  await kvSet(storeKey, next, windowSeconds);
  if (next.count < threshold) return { ok: true, called: false, reason: 'threshold', count: next.count };
  return escalateOwner({ category: 'service', severity: 'critical', summary });
}