import { ADDON_CREDITS_PER_PENCE, OVERAGE_REQUEST_COST_PENCE, getPlanDefinition, normalisePlan } from './pricing.js';

function parse(result) {
  if (result === null || result === undefined) return null;
  try { return JSON.parse(result); } catch { return null; }
}

function hourWindow(now = Date.now()) {
  const resetAt = Math.floor(now / 3600000 + 1) * 3600000;
  const bucket = new Date(now).toISOString().slice(0, 13).replace(/[-T:]/g, '');
  return { resetAt, bucket, ttlSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)) };
}

function weekWindow(now = Date.now()) {
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const startAt = Math.floor(now / weekMs) * weekMs;
  const resetAt = startAt + weekMs;
  return { startAt, resetAt, ttlSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)) };
}

function identityKey(identity) {
  const value = String(identity || 'anonymous').trim().toLowerCase().slice(0, 180);
  return value || 'anonymous';
}

function utcDayWindow(now = Date.now()) {
  const date = new Date(now);
  const startAt = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const resetAt = startAt + 24 * 60 * 60 * 1000;
  return { startAt, resetAt, ttlSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)) };
}

const UK_CREDIT_TIME_ZONE = 'Europe/London';
const ukDateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: UK_CREDIT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const ukOffsetFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: UK_CREDIT_TIME_ZONE,
  hour: '2-digit',
  timeZoneName: 'longOffset',
  hourCycle: 'h23',
});

function ukDateParts(now = Date.now()) {
  const parts = Object.fromEntries(
    ukDateFormatter.formatToParts(new Date(now))
      .filter((part) => ['year', 'month', 'day'].includes(part.type))
      .map((part) => [part.type, Number(part.value)]),
  );
  return { year: parts.year, month: parts.month, day: parts.day };
}

function ukOffsetMinutes(at) {
  const name = ukOffsetFormatter.formatToParts(new Date(at))
    .find((part) => part.type === 'timeZoneName')?.value || 'GMT';
  if (name === 'GMT') return 0;
  const match = /^GMT([+-])(\d{2}):(\d{2})$/.exec(name);
  if (!match) throw new Error(`Unsupported UK timezone offset: ${name}`);
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === '-' ? -minutes : minutes;
}

function ukMidnightUtc(year, month, day) {
  const utcGuess = Date.UTC(year, month - 1, day);
  return utcGuess - ukOffsetMinutes(utcGuess) * 60 * 1000;
}

function ukDayWindow(now = Date.now()) {
  const current = ukDateParts(now);
  const startAt = ukMidnightUtc(current.year, current.month, current.day);
  const nextDate = new Date(Date.UTC(current.year, current.month - 1, current.day + 1));
  const resetAt = ukMidnightUtc(nextDate.getUTCFullYear(), nextDate.getUTCMonth() + 1, nextDate.getUTCDate());
  return { startAt, resetAt, ttlSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)) };
}

function calendarMonthWindow(now = Date.now()) {
  const date = new Date(now);
  const startAt = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
  const resetAt = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
  return { startAt, resetAt, ttlSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)) };
}

function monthlyBoundary(anchorAt, year, month) {
  const anchor = new Date(Number(anchorAt) || Date.now());
  const day = anchor.getUTCDate();
  const hour = anchor.getUTCHours();
  const minute = anchor.getUTCMinutes();
  const second = anchor.getUTCSeconds();
  const ms = anchor.getUTCMilliseconds();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Date.UTC(year, month, Math.min(day, lastDay), hour, minute, second, ms);
}

function monthlyCreditWindow(anchorAt, now = Date.now()) {
  const current = new Date(now);
  let year = current.getUTCFullYear();
  let month = current.getUTCMonth();
  let startAt = monthlyBoundary(anchorAt, year, month);
  if (startAt > now) {
    month -= 1;
    if (month < 0) { month = 11; year -= 1; }
    startAt = monthlyBoundary(anchorAt, year, month);
  }
  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 11) { nextMonth = 0; nextYear += 1; }
  const resetAt = monthlyBoundary(anchorAt, nextYear, nextMonth);
  return { startAt, resetAt, ttlSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)) };
}

export function creditWindow(plan, anchorAt = Date.now(), now = Date.now()) {
  const definition = getPlanDefinition(plan);
  if (definition.creditPeriod === 'day') {
    return definition.id === 'free' ? ukDayWindow(now) : utcDayWindow(now);
  }
  if (definition.creditPeriod === 'month') return monthlyCreditWindow(anchorAt, now);
  return { startAt: 0, resetAt: 0, ttlSeconds: 0 };
}

function creditCounterKey(identity, plan, anchorAt, now) {
  const window = creditWindow(plan, anchorAt, now);
  return `stellar:credits:${window.startAt}:${identityKey(identity)}`;
}

function hourlyCounterKey(identity, now = Date.now()) {
  const window = hourWindow(now);
  return `stellar:hourly:${window.bucket}:${identityKey(identity)}`;
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

const HOURLY_RATE_LUA = `
local current = tonumber(redis.call('GET', KEYS[1]) or '0') or 0
local limit = tonumber(ARGV[1]) or 0
local ttl = tonumber(ARGV[2]) or 1
if limit <= 0 then return {1, current, ttl} end
if current >= limit then return {0, current, ttl} end
local next = current + 1
redis.call('SET', KEYS[1], next, 'EX', ttl)
return {1, next, ttl}
`;

// Atomically spends included plan credits first, then optional purchased add-on credits.
// walletPence is intentionally retained as the storage field for backwards compatibility;
// one stored penny equals one add-on credit.
const CREDIT_USAGE_LUA = `
local used = tonumber(redis.call('GET', KEYS[1]) or '0') or 0
local allowance = tonumber(ARGV[1]) or 0
local cost = tonumber(ARGV[2]) or 0
local ttl = tonumber(ARGV[3]) or 1
local allowAddon = tonumber(ARGV[4]) or 0
local now = tonumber(ARGV[5]) or 0

local remaining = math.max(0, allowance - used)
local includedCharge = math.min(cost, remaining)
local addonCharge = math.max(0, cost - includedCharge)
local wallet = -1

if addonCharge > 0 then
  if allowAddon ~= 1 then return {0, used, 0, addonCharge, 0} end
  local raw = redis.call('GET', KEYS[2])
  if not raw then return {0, used, 0, addonCharge, 0} end
  local ok, user = pcall(cjson.decode, raw)
  if not ok or type(user) ~= 'table' then return {0, used, 0, addonCharge, 0} end
  wallet = tonumber(user.walletPence or 0) or 0
  if wallet < addonCharge then return {0, used, 0, addonCharge, wallet} end
  user.walletPence = wallet - addonCharge
  user.updatedAt = now
  redis.call('SET', KEYS[2], cjson.encode(user))
  wallet = wallet - addonCharge
end

local newUsed = used + includedCharge
if includedCharge > 0 then
  redis.call('SET', KEYS[1], newUsed, 'EX', ttl)
end
return {1, newUsed, includedCharge, addonCharge, wallet}
`;

const REFUND_USAGE_LUA = `
local includedRefund = tonumber(ARGV[1]) or 0
local addonRefund = tonumber(ARGV[2]) or 0
local now = tonumber(ARGV[3]) or 0
local used = tonumber(redis.call('GET', KEYS[1]) or '0') or 0
local newUsed = math.max(0, used - includedRefund)
if includedRefund > 0 then
  local ttl = redis.call('TTL', KEYS[1])
  if newUsed == 0 then
    redis.call('DEL', KEYS[1])
  elseif ttl and ttl > 0 then
    redis.call('SET', KEYS[1], newUsed, 'EX', ttl)
  else
    redis.call('SET', KEYS[1], newUsed)
  end
end
local wallet = -1
if addonRefund > 0 then
  local raw = redis.call('GET', KEYS[2])
  if raw then
    local ok, user = pcall(cjson.decode, raw)
    if ok and type(user) == 'table' then
      wallet = tonumber(user.walletPence or 0) or 0
      user.walletPence = wallet + addonRefund
      user.updatedAt = now
      redis.call('SET', KEYS[2], cjson.encode(user))
      wallet = wallet + addonRefund
    end
  end
end
return {newUsed, wallet}
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

export function usageSnapshotFromRecord(plan, record, now = Date.now(), creditAnchorAt = now) {
  const canonicalPlan = normalisePlan(plan) || 'free';
  const definition = getPlanDefinition(canonicalPlan);
  const window = creditWindow(canonicalPlan, creditAnchorAt, now);
  const limit = Math.max(0, Number(definition.includedCredits) || 0);
  const used = Math.max(0, Number(record) || 0);
  return {
    plan: canonicalPlan,
    unit: 'credits',
    limit,
    used: Math.min(used, limit),
    remaining: Math.max(0, limit - used),
    resetAt: window.resetAt ? new Date(window.resetAt).toISOString() : null,
    creditPeriod: definition.creditPeriod,
  };
}

export async function getUsageSnapshot({ url, token, identity, plan, creditAnchorAt = Date.now(), now = Date.now() }) {
  const key = creditCounterKey(identity, plan, creditAnchorAt, now);
  const record = await kvGet(url, token, key);
  return usageSnapshotFromRecord(plan, record, now, creditAnchorAt);
}

export async function consumeHourlyRequest({ url, token, identity, plan, now = Date.now() }) {
  const definition = getPlanDefinition(plan);
  if (definition.id === 'owner') {
    return { allowed: true, limit: null, used: 0, remaining: null, resetAt: null, retryAfterSec: 0 };
  }
  const limit = Math.max(1, Number(definition.requestsPerHour) || 1);
  const window = hourWindow(now);
  const key = hourlyCounterKey(identity, now);
  const result = await kvEval(url, token, ['EVAL', HOURLY_RATE_LUA, 1, key, limit, window.ttlSeconds]);
  const values = Array.isArray(result) ? result.map(Number) : [];
  const allowed = values[0] === 1;
  const used = Math.max(0, values[1] || 0);
  return {
    allowed,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    resetAt: new Date(window.resetAt).toISOString(),
    retryAfterSec: allowed ? 0 : window.ttlSeconds,
    _counterKey: key,
  };
}

/**
 * Reserves credits before a generation. Included plan credits are spent first.
 * When the user opts in, purchased add-on credits cover the remainder.
 */
export async function consumeUsage({
  url,
  token,
  identity,
  plan,
  walletKey = '',
  allowCredit = false,
  creditCostPence = OVERAGE_REQUEST_COST_PENCE,
  creditCost = creditCostPence * ADDON_CREDITS_PER_PENCE,
  creditAnchorAt = Date.now(),
  now = Date.now(),
}) {
  const canonicalPlan = normalisePlan(plan) || 'free';
  const definition = getPlanDefinition(canonicalPlan);
  if (definition.id === 'owner') {
    return {
      plan: 'owner', unit: 'credits', limit: null, used: 0, remaining: null,
      resetAt: null, creditPeriod: 'unlimited', allowed: true, creditCost: 0,
      includedCreditsCharged: 0, chargedCreditPence: 0, walletPence: null,
    };
  }

  const window = creditWindow(canonicalPlan, creditAnchorAt, now);
  const key = creditCounterKey(identity, canonicalPlan, creditAnchorAt, now);
  const allowance = Math.max(0, Number(definition.includedCredits) || 0);
  const cost = Math.max(1, Math.round(Number(creditCost) || OVERAGE_REQUEST_COST_PENCE));
  const walletStorageKey = walletKey || `stellar:wallet:none:${identityKey(identity)}`;
  const result = await kvEval(url, token, [
    'EVAL', CREDIT_USAGE_LUA, 2, key, walletStorageKey,
    allowance, cost, window.ttlSeconds, allowCredit ? 1 : 0, now,
  ]);
  const values = Array.isArray(result) ? result.map(Number) : [];
  const allowed = values[0] === 1;
  const used = Math.max(0, values[1] || 0);
  const includedCreditsCharged = Math.max(0, values[2] || 0);
  const chargedCreditPence = Math.max(0, values[3] || 0);
  const walletPence = Number.isFinite(values[4]) && values[4] >= 0 ? values[4] : null;
  return {
    ...usageSnapshotFromRecord(canonicalPlan, used, now, creditAnchorAt),
    allowed,
    reason: allowed ? null : 'credits',
    creditCost: cost,
    includedCreditsCharged,
    addOnCreditsCharged: chargedCreditPence * ADDON_CREDITS_PER_PENCE,
    chargedCreditPence,
    walletPence,
    _counterKey: key,
  };
}

export async function refundUsageCharge({
  url,
  token,
  counterKey,
  walletKey,
  includedCredits = 0,
  amountPence = 0,
  now = Date.now(),
}) {
  if (!counterKey) return null;
  const walletStorageKey = walletKey || 'stellar:wallet:none:refund';
  const result = await kvEval(url, token, [
    'EVAL', REFUND_USAGE_LUA, 2, counterKey, walletStorageKey,
    Math.max(0, Math.round(Number(includedCredits) || 0)),
    Math.max(0, Math.round(Number(amountPence) || 0)),
    now,
  ]);
  const values = Array.isArray(result) ? result.map(Number) : [];
  return {
    usedCredits: Math.max(0, values[0] || 0),
    walletPence: Number.isFinite(values[1]) && values[1] >= 0 ? values[1] : null,
  };
}

export async function refundUsageCredit({ url, token, walletKey, amountPence, now = Date.now() }) {
  const amount = Math.max(0, Math.round(Number(amountPence) || 0));
  if (!walletKey || amount <= 0) return null;
  const result = await kvEval(url, token, ['EVAL', REFUND_CREDIT_LUA, 1, walletKey, amount, now]);
  const walletPence = Number(result);
  if (!Number.isFinite(walletPence) || walletPence < 0) throw new Error('Usage credit refund failed');
  return walletPence;
}

export { CREDIT_USAGE_LUA, HOURLY_RATE_LUA, REFUND_CREDIT_LUA, REFUND_USAGE_LUA, calendarMonthWindow, hourWindow, weekWindow, hourlyCounterKey, identityKey, monthlyCreditWindow, ukDayWindow };
