import { OVERAGE_REQUEST_COST_PENCE, getPlanDefinition, normalisePlan } from './pricing.js';

function parse(result) {
  if (result === null || result === undefined) return null;
  try { return JSON.parse(result); } catch { return null; }
}

function hourWindow(now = Date.now()) {
  const resetAt = Math.floor(now / 3600000 + 1) * 3600000;
  const bucket = new Date(now).toISOString().slice(0, 13).replace(/[-T:]/g, '');
  return { resetAt, bucket, ttlSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)) };
}

function identityKey(identity) {
  const value = String(identity || 'anonymous').trim().toLowerCase().slice(0, 180);
  return value || 'anonymous';
}

function counterKey(identity, now) {
  const { bucket } = hourWindow(now);
  return `stellar:usage:${bucket}:${identityKey(identity)}`;
}

async function kvGet(url, token, key) {
  const response = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Usage storage read failed');
  return parse((await response.json()).result);
}

async function kvEval(url, token, command) {
  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([command]),
  });
  if (!response.ok) throw new Error('Usage storage transaction failed');
  const results = await response.json();
  return results?.[0]?.result;
}

const CREDIT_USAGE_LUA = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1])) end
local requestLimit = tonumber(ARGV[2])
if count <= requestLimit then return {1, count, 0, -1} end
local raw = redis.call('GET', KEYS[2])
if not raw then return {0, count, 0, 0} end
local ok, user = pcall(cjson.decode, raw)
if not ok or type(user) ~= 'table' then return {0, count, 0, 0} end
local wallet = tonumber(user.walletPence or 0) or 0
local cost = tonumber(ARGV[3])
if wallet < cost then return {0, count, 0, wallet} end
user.walletPence = wallet - cost
user.updatedAt = tonumber(ARGV[4])
redis.call('SET', KEYS[2], cjson.encode(user))
return {1, count, cost, wallet - cost}
`;

const REFUND_CREDIT_LUA = `
local raw = redis.call('GET', KEYS[1])
if not raw then return -1 end
local ok, user = pcall(cjson.decode, raw)
if not ok or type(user) ~= 'table' then return -1 end
local wallet = tonumber(user.walletPence or 0) or 0
local amount = tonumber(ARGV[1])
user.walletPence = wallet + amount
user.updatedAt = tonumber(ARGV[2])
redis.call('SET', KEYS[1], cjson.encode(user))
return user.walletPence
`;

async function kvIncrement(url, token, key, seconds) {
  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    // INCR assigns a unique count even for concurrent requests. EXPIRE NX makes
    // the TTL belong to the UTC-hour bucket without extending it on every use.
    body: JSON.stringify([['INCR', key], ['EXPIRE', key, seconds, 'NX']]),
  });
  if (!response.ok) throw new Error('Usage storage write failed');
  const results = await response.json();
  return Math.max(0, Number(results?.[0]?.result) || 0);
}

export function usageSnapshotFromRecord(plan, record, now = Date.now()) {
  const canonicalPlan = normalisePlan(plan) || 'free';
  const definition = getPlanDefinition(canonicalPlan);
  const window = hourWindow(now);
  const count = typeof record === 'number'
    ? Math.max(0, record)
    : record && record.resetAt === window.resetAt ? Math.max(0, Number(record.count) || 0) : 0;
  return {
    plan: canonicalPlan,
    limit: definition.requestsPerHour,
    used: count,
    remaining: Math.max(0, definition.requestsPerHour - count),
    resetAt: new Date(window.resetAt).toISOString(),
  };
}

export async function getUsageSnapshot({ url, token, identity, plan, now = Date.now() }) {
  const record = await kvGet(url, token, counterKey(identity, now));
  return usageSnapshotFromRecord(plan, record, now);
}

/**
 * Consumes one request against a current UTC-hour bucket. Redis remains the
 * enforcement point; callers should fail closed only when their application
 * cannot safely serve an unmetered paid request.
 */
export async function consumeUsage({ url, token, identity, plan, walletKey = '', allowCredit = false, creditCostPence = OVERAGE_REQUEST_COST_PENCE, now = Date.now() }) {
  const key = counterKey(identity, now);
  const window = hourWindow(now);
  const canonicalPlan = normalisePlan(plan) || 'free';
  const definition = getPlanDefinition(canonicalPlan);

  if (allowCredit && walletKey) {
    const result = await kvEval(url, token, ['EVAL', CREDIT_USAGE_LUA, 2, key, walletKey, window.ttlSeconds, definition.requestsPerHour, creditCostPence, now]);
    const values = Array.isArray(result) ? result.map(Number) : [];
    const allowed = values[0] === 1;
    const count = Math.max(0, values[1] || 0);
    const chargedCreditPence = Math.max(0, values[2] || 0);
    const walletPence = Number.isFinite(values[3]) && values[3] >= 0 ? values[3] : null;
    return { ...usageSnapshotFromRecord(canonicalPlan, count, now), allowed, chargedCreditPence, walletPence, creditCostPence };
  }

  const count = await kvIncrement(url, token, key, window.ttlSeconds);
  const snapshot = usageSnapshotFromRecord(canonicalPlan, count, now);
  return { ...snapshot, allowed: snapshot.used <= snapshot.limit, chargedCreditPence: 0, walletPence: null, creditCostPence };
}

export async function refundUsageCredit({ url, token, walletKey, amountPence, now = Date.now() }) {
  const amount = Math.max(0, Math.round(Number(amountPence) || 0));
  if (!walletKey || amount <= 0) return null;
  const result = await kvEval(url, token, ['EVAL', REFUND_CREDIT_LUA, 1, walletKey, amount, now]);
  const walletPence = Number(result);
  if (!Number.isFinite(walletPence) || walletPence < 0) throw new Error('Usage credit refund failed');
  return walletPence;
}

export { CREDIT_USAGE_LUA, REFUND_CREDIT_LUA, hourWindow, identityKey };
