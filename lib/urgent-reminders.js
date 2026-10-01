import { createHash, randomUUID } from 'node:crypto';
import { OWNER_AUTO_CALL_CATEGORIES } from './auto-call-rules.js';
import { escalateOwner } from './owner-escalation.js';

const PREFIX = 'stellar:owner-reminder:';
const QUEUE_KEY = `${PREFIX}due`;
const MAX_FUTURE_MS = 30 * 24 * 60 * 60 * 1000;
const RETENTION_SECONDS = 31 * 24 * 60 * 60;
const DISPATCH_LEASE_SECONDS = 300;

export class UrgentReminderError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

function hash(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

export function parseReminderTime(value, now = Date.now()) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const timestamp = Math.trunc(value);
    if (timestamp < now - 60_000 || timestamp > now + MAX_FUTURE_MS) throw new UrgentReminderError('Reminder time must be within the next 30 days.');
    return Math.max(now, timestamp);
  }

  const text = String(value || '').trim();
  if (!text) throw new UrgentReminderError('A reminder time is required.');
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)) {
    throw new UrgentReminderError('Reminder time must include a timezone, for example 2026-10-01T20:15:00+01:00.');
  }
  const timestamp = Date.parse(text);
  if (!Number.isFinite(timestamp) || timestamp < now - 60_000 || timestamp > now + MAX_FUTURE_MS) {
    throw new UrgentReminderError('Reminder time must be valid and within the next 30 days.');
  }
  return Math.max(now, timestamp);
}

export function createRedisUrgentReminderStore({ fetcher = fetch, env = process.env } = {}) {
  const command = async (...args) => {
    const url = String(env.KV_REST_API_URL || '').replace(/\/$/, '');
    const token = String(env.KV_REST_API_TOKEN || '').trim();
    if (!url || !token) throw new UrgentReminderError('Urgent reminder storage is not configured.', 503);
    try {
      const response = await fetcher(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
        signal: AbortSignal.timeout(8000),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.error) throw new Error('storage');
      return body?.result;
    } catch {
      throw new UrgentReminderError('Urgent reminder storage is unavailable.', 503);
    }
  };
  const key = id => `${PREFIX}item:${id}`;
  const lease = id => `${PREFIX}lease:${id}`;
  return {
    async create(reminder) {
      const stored = await command('EVAL', `
        local existing = redis.call('GET', KEYS[1])
        if existing then return existing end
        redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[4])
        redis.call('ZADD', KEYS[2], ARGV[2], ARGV[3])
        redis.call('EXPIRE', KEYS[2], ARGV[4])
        return ARGV[1]`, 2, key(reminder.id), QUEUE_KEY,
      JSON.stringify(reminder), reminder.runAt, reminder.id, RETENTION_SECONDS);
      return JSON.parse(stored);
    },
    async load(id) {
      const raw = await command('GET', key(id));
      return raw ? JSON.parse(raw) : null;
    },
    async due(at, limit = 10) {
      return await command('ZRANGEBYSCORE', QUEUE_KEY, '-inf', at, 'LIMIT', 0, Math.max(1, Math.min(20, limit))) || [];
    },
    async claim(id, token) {
      const raw = await command('EVAL', `
        local payload = redis.call('GET', KEYS[1])
        if not payload then redis.call('ZREM', KEYS[2], ARGV[1]); return nil end
        if not redis.call('SET', KEYS[3], ARGV[2], 'NX', 'EX', ARGV[3]) then return nil end
        if redis.call('ZREM', KEYS[2], ARGV[1]) == 0 then redis.call('DEL', KEYS[3]); return nil end
        return payload`, 3, key(id), QUEUE_KEY, lease(id), id, token, DISPATCH_LEASE_SECONDS);
      return raw ? JSON.parse(raw) : null;
    },
    async save(reminder) {
      await command('SET', key(reminder.id), JSON.stringify(reminder), 'EX', RETENTION_SECONDS);
    },
    async cancel(id) {
      await command('ZREM', QUEUE_KEY, id);
    },
    async release(id, token) {
      await command('EVAL', "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0", 1, lease(id), token);
    },
  };
}

export function createUrgentReminderService({
  store = createRedisUrgentReminderStore(),
  escalate = escalateOwner,
  now = Date.now,
  uuid = randomUUID,
} = {}) {
  function publicReminder(reminder) {
    if (!reminder) return null;
    const { ownerEmail, metadata, ...safe } = reminder;
    return { ...safe, metadataPresent: Boolean(metadata && Object.keys(metadata).length) };
  }

  async function schedule(ownerEmail, input = {}) {
    const requestId = String(input.requestId || '').trim();
    if (!/^[a-zA-Z0-9_-]{12,80}$/.test(requestId)) throw new UrgentReminderError('A valid request ID is required.');
    const summary = String(input.summary || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    if (!summary) throw new UrgentReminderError('A reminder summary is required.');
    const category = String(input.category || 'approval').trim().toLowerCase();
    if (!OWNER_AUTO_CALL_CATEGORIES.includes(category)) throw new UrgentReminderError('Choose a supported urgent reminder category.');
    const severity = String(input.severity || 'urgent').trim().toLowerCase();
    if (!['urgent', 'critical'].includes(severity)) throw new UrgentReminderError('Urgent reminders must be urgent or critical.');
    const createdAt = now();
    const runAt = parseReminderTime(input.runAt, createdAt);
    const id = hash(`${ownerEmail}:${requestId}`).slice(0, 40);
    const reminder = {
      id, ownerEmail, category, severity, summary, runAt, createdAt, updatedAt: createdAt,
      status: 'scheduled',
      metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {},
    };
    return publicReminder(await store.create(reminder));
  }

  async function cancel(ownerEmail, id) {
    const reminder = await store.load(String(id || ''));
    if (!reminder || reminder.ownerEmail !== ownerEmail) throw new UrgentReminderError('Reminder not found.', 404);
    if (reminder.status !== 'scheduled') return publicReminder(reminder);
    reminder.status = 'cancelled';
    reminder.updatedAt = now();
    await store.cancel(reminder.id);
    await store.save(reminder);
    return publicReminder(reminder);
  }

  async function dispatchDue({ limit = 10 } = {}) {
    const at = now();
    const ids = await store.due(at, limit);
    let processed = 0;
    for (const id of ids) {
      const token = uuid();
      const reminder = await store.claim(id, token);
      if (!reminder) continue;
      try {
        reminder.status = 'attempting';
        reminder.attemptedAt = now();
        reminder.updatedAt = reminder.attemptedAt;
        await store.save(reminder);

        let result;
        try {
          result = await escalate({
            category: reminder.category,
            severity: reminder.severity,
            summary: reminder.summary,
            metadata: { ...reminder.metadata, trigger: 'scheduled-urgent-reminder', reminderId: reminder.id, scheduledFor: reminder.runAt },
          });
        } catch (error) {
          result = { ok: false, called: false, reason: 'dispatch-error', error: String(error?.message || error).slice(0, 160) };
        }

        reminder.status = result?.ok ? 'dispatched' : 'failed';
        reminder.called = result?.called === true;
        reminder.dispatchReason = String(result?.reason || result?.fallback || '').slice(0, 120) || null;
        reminder.completedAt = now();
        reminder.updatedAt = reminder.completedAt;
        await store.save(reminder);
        processed += 1;
      } finally {
        await store.release(reminder.id, token).catch(() => {});
      }
    }
    return { processed, due: ids.length, checkedAt: at };
  }

  return { schedule, cancel, dispatchDue };
}
