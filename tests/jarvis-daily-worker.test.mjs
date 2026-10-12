import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import jarvisWorker from '../api/jarvis-worker.js';

const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const ownerPanel = readFileSync(new URL('../lib/assets/jarvis-owner-workflows.js', import.meta.url), 'utf8');

function response() {
  return {
    code: 200, payload: undefined,
    setHeader() {},
    status(code) { this.code = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
}

test('Jarvis has a platform-native, free-tier-compatible daily recovery schedule', () => {
  assert.deepEqual(vercel.crons?.filter(job => job.path === '/api/jarvis-worker'), [
    { path: '/api/jarvis-worker', schedule: '0 7 * * *' },
  ]);
  assert.match(ownerPanel, /Last background check:/);
  assert.match(ownerPanel, /Run saved task now/);
  assert.match(ownerPanel, /Retry failed step/);
  assert.match(ownerPanel, /currentId !== mission\.id/);
});

test('dedicated worker endpoint always uses protected cron action, not caller-selected actions', async () => {
  const old = process.env.CRON_SECRET;
  process.env.CRON_SECRET = 'test-secret-for-worker-auth';
  try {
    const unauthorized = response();
    await jarvisWorker({ method: 'GET', query: { action: 'status' }, headers: { authorization: 'Bearer incorrect' } }, unauthorized);
    assert.equal(unauthorized.code, 401);
    assert.match(unauthorized.payload?.error || '', /Scheduler authorization required/);

    const forbiddenMethod = response();
    await jarvisWorker({ method: 'POST', query: { action: 'create' }, headers: { authorization: 'Bearer test-secret-for-worker-auth' } }, forbiddenMethod);
    assert.equal(forbiddenMethod.code, 405);
    assert.match(forbiddenMethod.payload?.error || '', /Method not allowed/);
  } finally {
    if (old === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = old;
  }
});
