import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createUrgentReminderService, parseReminderTime, UrgentReminderError } from '../lib/urgent-reminders.js';

function memoryStore() {
  const records = new Map();
  const queued = new Set();
  const claimed = new Set();
  const copy = value => value == null ? value : structuredClone(value);
  return {
    records,
    async create(reminder) {
      if (!records.has(reminder.id)) {
        records.set(reminder.id, copy(reminder));
        queued.add(reminder.id);
      }
      return copy(records.get(reminder.id));
    },
    async load(id) { return copy(records.get(id)); },
    async due(at, limit = 10) {
      return [...queued]
        .filter(id => Number(records.get(id)?.runAt || 0) <= at)
        .sort((a, b) => records.get(a).runAt - records.get(b).runAt)
        .slice(0, limit);
    },
    async claim(id) {
      if (!queued.has(id) || claimed.has(id)) return null;
      claimed.add(id);
      queued.delete(id);
      return copy(records.get(id));
    },
    async save(reminder) { records.set(reminder.id, copy(reminder)); },
    async cancel(id) { queued.delete(id); },
    async release(id) { claimed.delete(id); },
  };
}

test('scheduled urgent reminders require an explicit timezone', () => {
  const now = Date.parse('2026-10-01T18:00:00Z');
  assert.equal(
    parseReminderTime('2026-10-01T19:15:00+01:00', now),
    Date.parse('2026-10-01T18:15:00Z'),
  );
  assert.throws(
    () => parseReminderTime('2026-10-01T19:15:00', now),
    error => error instanceof UrgentReminderError && /timezone/i.test(error.message),
  );
});

test('urgent reminder dispatcher does not fire early and dispatches a due reminder once', async () => {
  const store = memoryStore();
  let current = Date.parse('2026-10-01T18:00:00Z');
  const escalations = [];
  const service = createUrgentReminderService({
    store,
    now: () => current,
    uuid: () => 'lease-fixture',
    escalate: async input => {
      escalations.push(input);
      return { ok: true, called: true, reason: 'test' };
    },
  });

  const reminder = await service.schedule('owner@example.com', {
    requestId: 'reminder-request-12345',
    runAt: '2026-10-01T19:05:00+01:00',
    category: 'approval',
    severity: 'urgent',
    summary: 'Decision needed on the owner call pipeline.',
    metadata: { source: 'test' },
  });
  assert.equal(reminder.status, 'scheduled');
  assert.equal(reminder.ownerEmail, undefined);
  assert.equal(reminder.metadata, undefined);
  assert.equal(reminder.metadataPresent, true);

  current = Date.parse('2026-10-01T18:04:59Z');
  assert.deepEqual(await service.dispatchDue(), { processed: 0, due: 0, checkedAt: current });
  assert.equal(escalations.length, 0);

  current = Date.parse('2026-10-01T18:05:00Z');
  assert.deepEqual(await service.dispatchDue(), { processed: 1, due: 1, checkedAt: current });
  assert.equal(escalations.length, 1);
  assert.equal(escalations[0].metadata.trigger, 'scheduled-urgent-reminder');

  current += 60_000;
  assert.deepEqual(await service.dispatchDue(), { processed: 0, due: 0, checkedAt: current });
  assert.equal(escalations.length, 1);
});

test('urgent reminder cron is configured for per-minute dispatch and keeps the mission recovery cron separate', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const urgent = config.crons.find(item => item.path === '/api/urgent-reminders');
  const recovery = config.crons.find(item => item.path.includes('surface=jarvis&action=worker'));
  assert.equal(urgent?.schedule, '* * * * *');
  assert.equal(recovery?.schedule, '25 8 * * *');
});
