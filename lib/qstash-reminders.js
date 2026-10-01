import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { OWNER_AUTO_CALL_CATEGORIES } from './auto-call-rules.js';

const PREFIX = 'stellar:qstash-reminder:';
const RETENTION_SECONDS = 45 * 24 * 60 * 60;
const LEASE_SECONDS = 300;
const DEFAULT_MAX_DELAY_DAYS = 7;
const DEFAULT_QSTASH_URL = 'https://qstash.upstash.io';
const DEFAULT_PUBLIC_URL = 'https://trystellarai.com';

export class QStashReminderError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const hash = value => createHash('sha256').update(String(value)).digest('hex');

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

function decodeBase64Url(value) {
  const input = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = input + '='.repeat((4 - (input.length % 4 || 4)) % 4);
  return Buffer.from(padded, 'base64');
}

function normalizeBase64Url(value) {
  return String(value || '').trim().replace(/=+$/g, '');
}

export function qstashReminderDestination(env = process.env) {
  const base = String(env.JARVIS_PUBLIC_URL || DEFAULT_PUBLIC_URL).trim().replace(/\/$/, '');
  return `${base}/api/webhook?source=qstash-reminder`;
}

export function qstashReminderConfigured(env = process.env) {
  return Boolean(
    String(env.QSTASH_TOKEN || '').trim()
    && String(env.QSTASH_CURRENT_SIGNING_KEY || '').trim()
    && String(env.QSTASH_NEXT_SIGNING_KEY || '').trim()
    && String(env.KV_REST_API_URL || '').trim()
    && String(env.KV_REST_API_TOKEN || '').trim()
  );
}

export function parseUrgentReminderTime(value, now = Date.now(), env = process.env) {
  let timestamp;
  if (typeof value === 'number' && Number.isFinite(value)) {
    timestamp = Math.trunc(value);
  } else {
    const text = String(value || '').trim();
    if (!text) throw new QStashReminderError('A reminder time is required.');
    if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)) {
      throw new QStashReminderError('Reminder time must include a timezone, for example 2026-10-01T20:15:00+01:00.');
    }
    timestamp = Date.parse(text);
  }

  if (!Number.isFinite(timestamp)) throw new QStashReminderError('Reminder time is invalid.');
  if (timestamp < now - 30_000) throw new QStashReminderError('Reminder time is already in the past.');

  const configuredMax = Number(env.QSTASH_MAX_DELAY_DAYS);
  const maxDays = Number.isFinite(configuredMax)
    ? Math.min(365, Math.max(1, configuredMax))
    : DEFAULT_MAX_DELAY_DAYS;
  if (timestamp > now + maxDays * 24 * 60 * 60 * 1000) {
    throw new QStashReminderError(`Reminder time is beyond the configured QStash delay window of ${maxDays} days.`);
  }
  return Math.max(now, timestamp);
}

export function verifyQStashSignature({ rawBody, signature, url, env = process.env, now = Date.now() } = {}) {
  const token = String(signature || '').trim();
  const body = typeof rawBody === 'string' ? rawBody : Buffer.from(rawBody || '').toString('utf8');
  const expectedUrl = String(url || qstashReminderDestination(env)).trim();
  const keys = [
    String(env.QSTASH_CURRENT_SIGNING_KEY || '').trim(),
    String(env.QSTASH_NEXT_SIGNING_KEY || '').trim(),
  ].filter(Boolean);

  if (!token || keys.length < 1 || !expectedUrl) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  let header;
  let payload;
  try {
    header = JSON.parse(decodeBase64Url(parts[0]).toString('utf8'));
    payload = JSON.parse(decodeBase64Url(parts[1]).toString('utf8'));
  } catch {
    return false;
  }
  if (header?.alg !== 'HS256') return false;

  const signed = `${parts[0]}.${parts[1]}`;
  const providedSignature = normalizeBase64Url(parts[2]);
  const signatureValid = keys.some((key) => {
    const expected = createHmac('sha256', key).update(signed).digest('base64url');
    return safeEqual(normalizeBase64Url(expected), providedSignature);
  });
  if (!signatureValid) return false;

  const nowSeconds = Math.floor(now / 1000);
  if (payload?.iss !== 'Upstash' || payload?.sub !== expectedUrl) return false;
  if (!Number.isFinite(Number(payload?.exp)) || Number(payload.exp) < nowSeconds - 5) return false;
  if (!Number.isFinite(Number(payload?.nbf)) || Number(payload.nbf) > nowSeconds + 5) return false;

  const expectedBodyHash = createHash('sha256').update(body).digest('base64url');
  return safeEqual(normalizeBase64Url(payload?.body), normalizeBase64Url(expectedBodyHash));
}

export function createRedisQStashReminderStore({ fetcher = fetch, env = process.env } = {}) {
  const command = async (...args) => {
    const url = String(env.KV_REST_API_URL || '').trim().replace(/\/$/, '');
    const token = String(env.KV_REST_API_TOKEN || '').trim();
    if (!url || !token) throw new QStashReminderError('Urgent reminder storage is not configured.', 503);
    try {
      const response = await fetcher(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
        signal: AbortSignal.timeout(8000),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.error) throw new Error('storage');
      return data?.result;
    } catch {
      throw new QStashReminderError('Urgent reminder storage is unavailable.', 503);
    }
  };

  const key = id => `${PREFIX}item:${id}`;
  const ownerIndex = ownerEmail => `${PREFIX}owner:${hash(ownerEmail)}`;
  const lease = id => `${PREFIX}lease:${id}`;

  return {
    async create(reminder) {
      const raw = await command('EVAL', `
        local existing = redis.call('GET', KEYS[1])
        if existing then return existing end
        redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[4])
        redis.call('ZADD', KEYS[2], ARGV[2], ARGV[3])
        redis.call('EXPIRE', KEYS[2], ARGV[4])
        redis.call('ZREMRANGEBYRANK', KEYS[2], 0, -51)
        return ARGV[1]`,
        2, key(reminder.id), ownerIndex(reminder.ownerEmail),
        JSON.stringify(reminder), reminder.runAt, reminder.id, RETENTION_SECONDS);
      return JSON.parse(raw);
    },

    async load(id) {
      const raw = await command('GET', key(id));
      return raw ? JSON.parse(raw) : null;
    },

    async list(ownerEmail) {
      const ids = await command('ZREVRANGE', ownerIndex(ownerEmail), 0, 49) || [];
      if (!ids.length) return [];
      const records = await command('MGET', ...ids.map(key));
      return records.filter(Boolean).map(raw => JSON.parse(raw));
    },

    async attachMessage(id, messageId, at) {
      const raw = await command('EVAL', `
        local payload = redis.call('GET', KEYS[1])
        if not payload then return nil end
        local item = cjson.decode(payload)
        if item.status == 'cancelled' then return payload end
        item.messageId = ARGV[1]
        item.status = 'scheduled'
        item.updatedAt = tonumber(ARGV[2])
        local encoded = cjson.encode(item)
        redis.call('SET', KEYS[1], encoded, 'EX', ARGV[3])
        return encoded`, 1, key(id), messageId, at, RETENTION_SECONDS);
      return raw ? JSON.parse(raw) : null;
    },

    async markPublishFailed(id, message, at) {
      const raw = await command('EVAL', `
        local payload = redis.call('GET', KEYS[1])
        if not payload then return nil end
        local item = cjson.decode(payload)
        if item.status == 'cancelled' then return payload end
        item.status = 'publish_failed'
        item.error = ARGV[1]
        item.updatedAt = tonumber(ARGV[2])
        local encoded = cjson.encode(item)
        redis.call('SET', KEYS[1], encoded, 'EX', ARGV[3])
        return encoded`, 1, key(id), String(message || '').slice(0, 180), at, RETENTION_SECONDS);
      return raw ? JSON.parse(raw) : null;
    },

    async cancel(id, ownerEmail, at) {
      const raw = await command('EVAL', `
        local payload = redis.call('GET', KEYS[1])
        if not payload then return 'NOT_FOUND' end
        local item = cjson.decode(payload)
        if item.ownerEmail ~= ARGV[1] then return 'NOT_FOUND' end
        if item.status == 'attempting' then return 'IN_FLIGHT' end
        if item.status == 'dispatched' or item.status == 'uncertain' then return payload end
        item.status = 'cancelled'
        item.cancelledAt = tonumber(ARGV[2])
        item.updatedAt = tonumber(ARGV[2])
        local encoded = cjson.encode(item)
        redis.call('SET', KEYS[1], encoded, 'EX', ARGV[3])
        return encoded`, 1, key(id), ownerEmail, at, RETENTION_SECONDS);
      if (raw === 'NOT_FOUND') throw new QStashReminderError('Reminder not found.', 404);
      if (raw === 'IN_FLIGHT') throw new QStashReminderError('This reminder is already being delivered and can no longer be safely cancelled.', 409);
      return JSON.parse(raw);
    },

    async claim(id, nonce, token, at) {
      const raw = await command('EVAL', `
        local payload = redis.call('GET', KEYS[1])
        if not payload then return nil end
        local item = cjson.decode(payload)
        if item.nonce ~= ARGV[1] then return nil end
        if item.status ~= 'scheduled' and item.status ~= 'publishing' then return nil end
        if not redis.call('SET', KEYS[2], ARGV[2], 'NX', 'EX', ARGV[4]) then return nil end
        item.status = 'attempting'
        item.attemptedAt = tonumber(ARGV[3])
        item.updatedAt = tonumber(ARGV[3])
        local encoded = cjson.encode(item)
        redis.call('SET', KEYS[1], encoded, 'EX', ARGV[5])
        return encoded`, 2, key(id), lease(id), nonce, token, at, LEASE_SECONDS, RETENTION_SECONDS);
      return raw ? JSON.parse(raw) : null;
    },

    async complete(id, token, patch, at) {
      const raw = await command('EVAL', `
        if redis.call('GET', KEYS[2]) ~= ARGV[1] then return nil end
        local payload = redis.call('GET', KEYS[1])
        if not payload then return nil end
        local item = cjson.decode(payload)
        local patch = cjson.decode(ARGV[2])
        for k,v in pairs(patch) do item[k] = v end
        item.updatedAt = tonumber(ARGV[3])
        local encoded = cjson.encode(item)
        redis.call('SET', KEYS[1], encoded, 'EX', ARGV[4])
        redis.call('DEL', KEYS[2])
        return encoded`, 2, key(id), lease(id), token, JSON.stringify(patch), at, RETENTION_SECONDS);
      return raw ? JSON.parse(raw) : null;
    },

    async release(id, token) {
      await command('EVAL', "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0", 1, lease(id), token);
    },
  };
}

export function publicQStashReminder(reminder) {
  if (!reminder) return null;
  const { ownerEmail, nonce, metadata, ...safe } = reminder;
  return {
    ...safe,
    metadataPresent: Boolean(metadata && typeof metadata === 'object' && Object.keys(metadata).length),
  };
}

function qstashBaseUrl(env) {
  return String(env.QSTASH_URL || DEFAULT_QSTASH_URL).trim().replace(/\/$/, '');
}

async function publishReminder({ reminder, fetcher, env }) {
  const token = String(env.QSTASH_TOKEN || '').trim();
  if (!token) throw new QStashReminderError('QStash is not configured.', 503);
  const destination = qstashReminderDestination(env);
  const endpoint = `${qstashBaseUrl(env)}/v2/publish/${encodeURIComponent(destination)}`;
  const response = await fetcher(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Upstash-Not-Before': String(Math.ceil(reminder.runAt / 1000)),
      'Upstash-Retries': '3',
      'Upstash-Retry-Delay': 'max(1000, pow(2, retried) * 1000)',
      'Upstash-Timeout': '30s',
      'Upstash-Deduplication-Id': `stellar-reminder-${reminder.id}`,
      'Upstash-Label': 'stellar-urgent-reminder',
    },
    body: JSON.stringify({ version: 1, reminderId: reminder.id, nonce: reminder.nonce }),
    signal: AbortSignal.timeout(10000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.messageId) {
    const message = String(data?.error || data?.message || `QStash returned HTTP ${response.status}`).slice(0, 180);
    throw new QStashReminderError(message, response.status >= 400 && response.status < 500 ? response.status : 502);
  }
  return { messageId: String(data.messageId), deduplicated: data?.deduplicated === true };
}

async function cancelPublishedMessage({ messageId, fetcher, env }) {
  if (!messageId || !String(env.QSTASH_TOKEN || '').trim()) return { cancelled: false, reason: 'not-published' };
  const response = await fetcher(`${qstashBaseUrl(env)}/v2/messages/${encodeURIComponent(messageId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${String(env.QSTASH_TOKEN).trim()}` },
    signal: AbortSignal.timeout(10000),
  });
  if (response.status === 404) return { cancelled: false, reason: 'already-delivered-or-missing' };
  if (!response.ok) return { cancelled: false, reason: `qstash-http-${response.status}` };
  return { cancelled: true };
}

export function createQStashReminderService({
  store = createRedisQStashReminderStore(),
  fetcher = fetch,
  env = process.env,
  now = Date.now,
  uuid = randomUUID,
} = {}) {
  async function schedule(ownerEmail, input = {}) {
    if (!qstashReminderConfigured(env)) throw new QStashReminderError('QStash urgent reminders are not configured yet.', 503);
    const category = String(input.category || 'approval').trim().toLowerCase();
    const severity = String(input.severity || 'urgent').trim().toLowerCase();
    const summary = String(input.summary || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    const requestId = String(input.requestId || '').trim();
    if (!OWNER_AUTO_CALL_CATEGORIES.includes(category)) throw new QStashReminderError('Choose a supported urgent reminder category.');
    if (!['urgent', 'critical'].includes(severity)) throw new QStashReminderError('Urgent reminders must be urgent or critical.');
    if (!summary) throw new QStashReminderError('A reminder summary is required.');
    if (!/^[a-zA-Z0-9_-]{12,80}$/.test(requestId)) throw new QStashReminderError('A valid request ID is required.');

    const createdAt = now();
    const runAt = parseUrgentReminderTime(input.runAt, createdAt, env);
    const id = hash(`${ownerEmail}:${requestId}`).slice(0, 40);
    const reminder = {
      id,
      ownerEmail,
      nonce: uuid(),
      category,
      severity,
      summary,
      runAt,
      status: 'publishing',
      createdAt,
      updatedAt: createdAt,
      metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {},
    };

    let stored = await store.create(reminder);
    if (['scheduled', 'attempting', 'dispatched', 'cancelled', 'uncertain'].includes(stored.status) || stored.messageId) {
      return publicQStashReminder(stored);
    }

    try {
      const published = await publishReminder({ reminder: stored, fetcher, env });
      stored = await store.attachMessage(stored.id, published.messageId, now()) || stored;
      return { ...publicQStashReminder(stored), deduplicated: published.deduplicated };
    } catch (error) {
      await store.markPublishFailed(stored.id, error?.message || 'QStash publish failed.', now()).catch(() => {});
      if (error instanceof QStashReminderError) throw error;
      throw new QStashReminderError('QStash could not schedule the reminder.', 502);
    }
  }

  async function cancel(ownerEmail, id) {
    if (!/^[a-f0-9]{40}$/.test(String(id || ''))) throw new QStashReminderError('Reminder not found.', 404);
    const existing = await store.load(id);
    if (!existing || existing.ownerEmail !== ownerEmail) throw new QStashReminderError('Reminder not found.', 404);
    if (existing.status === 'cancelled') return publicQStashReminder(existing);
    const cancelled = await store.cancel(id, ownerEmail, now());
    const provider = await cancelPublishedMessage({ messageId: cancelled.messageId, fetcher, env }).catch(() => ({ cancelled: false, reason: 'qstash-unavailable' }));
    return { ...publicQStashReminder(cancelled), qstashCancellation: provider };
  }

  async function status(ownerEmail) {
    const reminders = await store.list(ownerEmail);
    return {
      configured: qstashReminderConfigured(env),
      provider: 'qstash',
      destination: qstashReminderDestination(env),
      maxDelayDays: Number(env.QSTASH_MAX_DELAY_DAYS) || DEFAULT_MAX_DELAY_DAYS,
      reminders: reminders.filter(item => item.ownerEmail === ownerEmail).map(publicQStashReminder),
    };
  }

  return { schedule, cancel, status };
}

export async function deliverQStashReminder({
  rawBody,
  signature,
  upstashRegion = '',
  dispatch,
  store = createRedisQStashReminderStore(),
  env = process.env,
  now = Date.now,
  uuid = randomUUID,
} = {}) {
  const destination = qstashReminderDestination(env);
  if (!verifyQStashSignature({ rawBody, signature, url: destination, env, now: now() })) {
    throw new QStashReminderError('Invalid QStash signature.', 403);
  }

  let message;
  try {
    message = JSON.parse(typeof rawBody === 'string' ? rawBody : Buffer.from(rawBody || '').toString('utf8'));
  } catch {
    throw new QStashReminderError('Invalid QStash reminder payload.');
  }

  const reminderId = String(message?.reminderId || '');
  const nonce = String(message?.nonce || '');
  if (!/^[a-f0-9]{40}$/.test(reminderId) || !nonce) throw new QStashReminderError('Invalid QStash reminder payload.');

  const token = uuid();
  const claimed = await store.claim(reminderId, nonce, token, now());
  if (!claimed) {
    const existing = await store.load(reminderId);
    return {
      ok: true,
      duplicate: true,
      status: existing?.status || 'missing',
      reminder: publicQStashReminder(existing),
    };
  }

  try {
    if (typeof dispatch !== 'function') {
      await store.complete(reminderId, token, {
        status: 'failed',
        completedAt: now(),
        dispatchReason: 'dispatcher-not-configured',
      }, now());
      return { ok: false, status: 'failed', reason: 'dispatcher-not-configured' };
    }

    let result;
    try {
      result = await dispatch({
        category: claimed.category,
        severity: claimed.severity,
        summary: claimed.summary,
        metadata: {
          ...(claimed.metadata || {}),
          trigger: 'qstash-scheduled-reminder',
          reminderId: claimed.id,
          scheduledFor: claimed.runAt,
          qstashRegion: String(upstashRegion || '').slice(0, 40) || null,
        },
      });
    } catch (error) {
      const completed = await store.complete(reminderId, token, {
        status: 'uncertain',
        completedAt: now(),
        dispatchReason: 'dispatch-threw-after-claim',
        error: String(error?.message || error).slice(0, 180),
      }, now()).catch(() => null);
      return {
        ok: true,
        uncertain: true,
        status: completed?.status || 'uncertain',
        reminder: publicQStashReminder(completed || claimed),
      };
    }

    const success = result?.ok === true;
    const completed = await store.complete(reminderId, token, {
      status: success ? 'dispatched' : 'failed',
      completedAt: now(),
      called: result?.called === true,
      provider: String(result?.provider || result?.fallback || '').slice(0, 80) || null,
      dispatchReason: String(result?.reason || result?.status || '').slice(0, 120) || null,
    }, now());

    return {
      ok: true,
      status: completed?.status || (success ? 'dispatched' : 'failed'),
      result: {
        called: result?.called === true,
        provider: result?.provider || null,
        fallback: result?.fallback || null,
        reason: result?.reason || null,
      },
      reminder: publicQStashReminder(completed || claimed),
    };
  } finally {
    await store.release(reminderId, token).catch(() => {});
  }
}
