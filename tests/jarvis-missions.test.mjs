import test from 'node:test';
import assert from 'node:assert/strict';
import { createMissionService, createRedisMissionStore } from '../lib/jarvis-missions.js';
import { memoryStore } from './helpers/jarvis-memory-store.mjs';

const owner = 'owner@example.com';
const input = { requestId: 'a-request-1234567', objective: 'Research and draft a useful small FiveM product.', kind: 'everything', notify: { email: true, call: true } };
function setup(overrides = {}) {
  const store = memoryStore(), runs = [], notices = [];
  const providers = {
    capabilities: () => ({ ai: true, search: true, email: true, phoneConfigured: true, scheduler: true }),
    research: async () => [{ title: 'Documentation', url: 'https://docs.fivem.net/', description: 'A source' }],
    generate: async args => { runs.push(args); return { text: `${args.role} result`, usage: { inputTokens: 30, outputTokens: 20 } }; },
    notifyOwner: async args => { notices.push(args); return { status: 'accepted', message: 'Accepted, not verified.' }; },
    ...overrides,
  };
  return { store, runs, notices, providers, service: createMissionService({ store, providers }) };
}

test('all workstreams execute and persist before owner notifications; repeated run does not spend or notify twice', async () => {
  const { service, store, runs, notices } = setup();
  const mission = await service.create(owner, input);
  assert.equal(mission.ownerEmail, undefined);
  assert.equal(mission.status, 'queued');
  const result = await service.run(mission.id, owner);
  assert.equal(result.status, 'completed');
  assert.deepEqual(runs.map(x => x.role), ['customers', 'products', 'operations', 'reviewer']);
  assert.equal(runs.at(-1).previousResults.length, 3);
  assert.equal(notices.length, 2);
  assert.ok(notices.every(x => x.ownerEmail === owner && x.mission.status === 'completed'));
  assert.equal(store.pending.size, 0);
  await service.run(mission.id, owner);
  assert.equal(runs.length, 4);
  assert.equal(notices.length, 2);
});

test('idempotent create and owner isolation prevent duplicate or cross-account tasks', async () => {
  const { service } = setup();
  const a = await service.create(owner, input), b = await service.create(owner, input);
  assert.equal(a.id, b.id);
  assert.equal((await service.status(owner)).missions.length, 1);
  assert.equal((await service.status('other@example.com')).missions.length, 0);
  await assert.rejects(service.run(a.id, 'other@example.com'), { status: 404 });
  await assert.rejects(service.cancel(a.id, 'other@example.com'), { status: 404 });
});

test('a failed specialist resumes without repeating saved work or sending an incomplete brief', async () => {
  let failure = true; const calls = [];
  const { service, notices } = setup({ generate: async args => { calls.push(args.role); if (args.role === 'products' && failure) throw new Error('provider'); return { text: 'Saved output' }; } });
  const m = await service.create(owner, input);
  const first = await service.run(m.id, owner);
  assert.equal(first.status, 'failed'); assert.equal(first.steps[0].result, 'Saved output'); assert.equal(notices.length, 0);
  await service.run(m.id, owner); assert.equal(calls.length, 2);
  failure = false;
  const result = await service.run(m.id, owner, { retry: true });
  assert.equal(result.status, 'completed');
  assert.equal(calls.filter(x => x === 'customers').length, 1);
  assert.equal(calls.filter(x => x === 'products').length, 2);
});

test('lease blocks concurrent work; cancellation stops subsequent specialists and notifications', async () => {
  let release, started;
  const startedPromise = new Promise(resolve => { started = resolve; });
  const wait = new Promise(resolve => { release = resolve; });
  const { service, notices } = setup({ generate: async () => { started(); await wait; return { text: 'First step' }; } });
  const m = await service.create(owner, input);
  const running = service.run(m.id, owner); await startedPromise;
  await assert.rejects(service.run(m.id, owner), { status: 409 });
  assert.equal((await service.cancel(m.id, owner)).cancellationRequested, true);
  release(); const result = await running;
  assert.equal(result.status, 'cancelled'); assert.equal(result.steps[0].status, 'completed');
  assert.equal(result.steps[1].status, 'cancelled'); assert.equal(notices.length, 0);
});

test('retry attempts are bounded and missing search never becomes completed research', async () => {
  const { service, runs } = setup({ capabilities: () => ({ ai: true, search: false }) });
  const m = await service.create(owner, input);
  for (let i = 0; i < 3; i++) assert.equal((await service.run(m.id, owner, { retry: true })).status, 'failed');
  await assert.rejects(service.run(m.id, owner, { retry: true }), /retry limit/);
  assert.equal(runs.length, 0);
});

test('interrupted notification intent is not sent again when a worker resumes', async () => {
  const { service, store, notices } = setup();
  const m = await service.create(owner, input);
  const persisted = store.tasks.get(m.id);
  persisted.status = 'completed'; persisted.steps.forEach(step => { step.status = 'completed'; step.result = 'Saved'; });
  persisted.notifications.email = { status: 'attempting', message: 'Unconfirmed' };
  persisted.notifications.call = { status: 'attempting', message: 'Unconfirmed' };
  await service.run(m.id, owner);
  assert.equal(notices.length, 0);
  assert.equal(store.pending.size, 0);
});

test('scheduled worker processes at most one queued mission and records its check', async () => {
  const { service, store } = setup();
  await service.create(owner, input);
  await service.create(owner, { ...input, requestId: 'another-request-12345' });
  assert.deepEqual(await service.tick(), { processed: 1 });
  assert.equal(store.pending.size, 1);
  assert.ok((await service.status(owner)).lastWorkerAt);
});

test('Redis storage fails closed on HTTP-200 command errors and stale worker leases', async () => {
  const env = { KV_REST_API_URL: 'https://storage.example', KV_REST_API_TOKEN: 'fixture' };
  const broken = createRedisMissionStore({ env, fetcher: async () => Response.json({ error: 'wrong type' }) });
  await assert.rejects(broken.load('id'), { status: 503 });
  const expired = createRedisMissionStore({ env, fetcher: async () => Response.json({ result: 0 }) });
  await assert.rejects(expired.save({ id: 'a', createdAt: 1 }, 'old-token', true), { status: 409 });
});
