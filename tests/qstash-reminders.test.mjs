import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import test from 'node:test';
import {
  createQStashReminderService,
  deliverQStashReminder,
  parseUrgentReminderTime,
  qstashReminderDestination,
  verifyQStashSignature,
} from '../lib/qstash-reminders.js';

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function memoryStore() {
  const records = new Map();
  return {
    records,
    async create(reminder) {
      if (!records.has(reminder.id)) records.set(reminder.id, clone(reminder));
      return clone(records.get(reminder.id));
    },
    async load(id) {
      return clone(records.get(id));
    },
    async list(ownerEmail) {
      return [...records.values()].filter(item => item.ownerEmail === ownerEmail).map(clone);
    },
    async attachMessage(id, messageId, at) {
      const item = records.get(id);
      if (!item) return null;
      if (item.status !== 'cancelled') Object.assign(item, { messageId, status: 'scheduled', updatedAt: at });
      return clone(item);
    },
    async markPublishFailed(id, message, at) {
      const item = records.get(id);
      if (!item) return null;
      if (item.status !== 'cancelled') Object.assign(item, { status: 'publish_failed', error: message, updatedAt: at });
      return clone(item);
    },
    async cancel(id, ownerEmail, at) {
      const item = records.get(id);
      if (!item || item.ownerEmail !== ownerEmail) {
        const error = new Error('Reminder not found.');
        error.status = 404;
        throw error;
      }
      if (item.status === 'attempting') {
        const error = new Error('In flight');
        error.status = 409;
        throw error;
      }
      Object.assign(item, { status: 'cancelled', cancelledAt: at, updatedAt: at });
      return clone(item);
    },
    async claim(id, nonce, token, at) {
      const item = records.get(id);
      if (!item || item.nonce !== nonce || !['scheduled', 'publishing'].includes(item.status)) return null;
      Object.assign(item, { status: 'attempting', attemptedAt: at, updatedAt: at, _lease: token });
      return clone(item);
    },
    async complete(id, token, patch, at) {
      const item = records.get(id);
      if (!item || item._lease !== token) return null;
      delete item._lease;
      Object.assign(item, clone(patch), { updatedAt: at });
      return clone(item);
    },
    async release(id, token) {
      const item = records.get(id);
      if (item?._lease === token) delete item._lease;
    },
  };
}

function baseEnv() {
  return {
    QSTASH_TOKEN: 'qstash-test-token',
    QSTASH_CURRENT_SIGNING_KEY: 'current-signing-key',
    QSTASH_NEXT_SIGNING_KEY: 'next-signing-key',
    KV_REST_API_URL: 'https://redis.example.test',
    KV_REST_API_TOKEN: 'redis-test-token',
    JARVIS_PUBLIC_URL: 'https://trystellarai.com',
    QSTASH_MAX_DELAY_DAYS: '7',
  };
}

function signQStash({ rawBody, url, key, now }) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const nowSeconds = Math.floor(now / 1000);
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({
    iss: 'Upstash',
    sub: url,
    exp: nowSeconds + 300,
    nbf: nowSeconds - 5,
    iat: nowSeconds,
    jti: 'jwt_test',
    body: createHash('sha256').update(rawBody).digest('base64url'),
  });
  const signature = createHmac('sha256', key).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

test('urgent reminder time parsing requires timezone-aware absolute times', () => {
  const now = Date.parse('2026-10-01T18:00:00Z');
  const env = baseEnv();
  assert.equal(
    parseUrgentReminderTime('2026-10-01T19:15:00+01:00', now, env),
    Date.parse('2026-10-01T18:15:00Z'),
  );
  assert.throws(
    () => parseUrgentReminderTime('2026-10-01T19:15:00', now, env),
    /timezone/i,
  );
  assert.throws(
    () => parseUrgentReminderTime('2026-10-09T18:00:00Z', now, env),
    /7 days/i,
  );
});

test('scheduler publishes a privacy-minimal delayed QStash callback without adding a serverless route', async () => {
  const store = memoryStore();
  const env = baseEnv();
  const now = Date.parse('2026-10-01T18:00:00Z');
  const requests = [];
  const fetcher = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    return Response.json({ messageId: 'msg_test_123', deduplicated: false });
  };
  const service = createQStashReminderService({
    store,
    env,
    fetcher,
    now: () => now,
    uuid: () => 'nonce-test-123',
  });

  const reminder = await service.schedule('owner@example.com', {
    requestId: 'request-fixture-12345',
    runAt: '2026-10-01T19:05:00+01:00',
    category: 'approval',
    severity: 'urgent',
    summary: 'Decision needed on a production deployment.',
    metadata: { source: 'test' },
  });

  assert.equal(reminder.status, 'scheduled');
  assert.equal(reminder.messageId, 'msg_test_123');
  assert.equal(reminder.ownerEmail, undefined);
  assert.equal(reminder.nonce, undefined);
  assert.equal(reminder.metadata, undefined);
  assert.equal(reminder.metadataPresent, true);
  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /^https:\/\/qstash\.upstash\.io\/v2\/publish\//);
  assert.equal(requests[0].options.headers['Upstash-Not-Before'], String(Math.ceil(Date.parse('2026-10-01T18:05:00Z') / 1000)));
  assert.equal(requests[0].options.headers['Upstash-Retries'], '3');
  assert.equal(requests[0].options.headers['Upstash-Deduplication-Id'], `stellar-reminder-${reminder.id}`);
  const payload = JSON.parse(requests[0].options.body);
  assert.deepEqual(Object.keys(payload).sort(), ['nonce', 'reminderId', 'version']);
  assert.equal(JSON.stringify(payload).includes('production deployment'), false);
});

test('QStash signatures are checked against the exact callback URL and raw body hash', () => {
  const env = baseEnv();
  const now = Date.parse('2026-10-01T18:00:00Z');
  const url = qstashReminderDestination(env);
  const rawBody = JSON.stringify({ version: 1, reminderId: 'a'.repeat(40), nonce: 'nonce-test-123' });
  const signature = signQStash({ rawBody, url, key: env.QSTASH_CURRENT_SIGNING_KEY, now });

  assert.equal(verifyQStashSignature({ rawBody, signature, url, env, now }), true);
  assert.equal(verifyQStashSignature({ rawBody: rawBody + ' ', signature, url, env, now }), false);
  assert.equal(verifyQStashSignature({ rawBody, signature, url: url + '&wrong=1', env, now }), false);
});

test('delivery claims the reminder before external calling and duplicate QStash delivery does not call twice', async () => {
  const store = memoryStore();
  const env = baseEnv();
  let now = Date.parse('2026-10-01T18:00:00Z');
  const published = [];
  const service = createQStashReminderService({
    store,
    env,
    fetcher: async (url, options = {}) => {
      published.push({ url: String(url), options });
      return Response.json({ messageId: 'msg_test_delivery' });
    },
    now: () => now,
    uuid: () => 'nonce-delivery-123',
  });

  const reminder = await service.schedule('owner@example.com', {
    requestId: 'delivery-request-12345',
    runAt: '2026-10-01T19:01:00+01:00',
    category: 'service',
    severity: 'critical',
    summary: 'Production service needs urgent owner attention.',
  });
  const rawBody = published[0].options.body;
  now = Date.parse('2026-10-01T18:01:00Z');
  const url = qstashReminderDestination(env);
  const signature = signQStash({ rawBody, url, key: env.QSTASH_CURRENT_SIGNING_KEY, now });
  let dispatches = 0;
  const dispatch = async input => {
    dispatches += 1;
    assert.equal(input.metadata.trigger, 'qstash-scheduled-reminder');
    assert.equal(input.metadata.reminderId, reminder.id);
    return { ok: true, called: false, fallback: 'push' };
  };

  const first = await deliverQStashReminder({
    rawBody,
    signature,
    dispatch,
    store,
    env,
    now: () => now,
    uuid: () => 'lease-1',
  });
  assert.equal(first.status, 'dispatched');
  assert.equal(dispatches, 1);

  const second = await deliverQStashReminder({
    rawBody,
    signature,
    dispatch,
    store,
    env,
    now: () => now,
    uuid: () => 'lease-2',
  });
  assert.equal(second.duplicate, true);
  assert.equal(second.status, 'dispatched');
  assert.equal(dispatches, 1);
});

test('cancelling a scheduled reminder marks it cancelled even if QStash cancellation arrives too late', async () => {
  const store = memoryStore();
  const env = baseEnv();
  const now = Date.parse('2026-10-01T18:00:00Z');
  const requests = [];
  const service = createQStashReminderService({
    store,
    env,
    fetcher: async (url, options = {}) => {
      requests.push({ url: String(url), options });
      if (options.method === 'DELETE') return new Response('', { status: 404 });
      return Response.json({ messageId: 'msg_cancel_fixture' });
    },
    now: () => now,
    uuid: () => 'nonce-cancel-123',
  });
  const scheduled = await service.schedule('owner@example.com', {
    requestId: 'cancel-request-12345',
    runAt: '2026-10-01T19:30:00+01:00',
    category: 'approval',
    severity: 'urgent',
    summary: 'Cancel fixture reminder.',
  });
  const cancelled = await service.cancel('owner@example.com', scheduled.id);
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.qstashCancellation.cancelled, false);
  assert.equal(cancelled.qstashCancellation.reason, 'already-delivered-or-missing');
  assert.equal(requests.some(item => item.options.method === 'DELETE'), true);
});
