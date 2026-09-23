import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { OVERAGE_REQUEST_COST_PENCE } from '../lib/pricing.js';
import { consumeUsage, refundUsageCredit } from '../lib/usage.js';

const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const chat = fs.readFileSync(new URL('../api/chat.js', import.meta.url), 'utf8');
const usageSource = fs.readFileSync(new URL('../lib/usage.js', import.meta.url), 'utf8');
const originalFetch = global.fetch;
test.afterEach(() => { global.fetch = originalFetch; });

function redisResult(result) {
  global.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body[0][0], 'EVAL');
    return { ok: true, json: async () => [{ result }] };
  };
}

test('overage request cost is server-owned at five pence', () => {
  assert.equal(OVERAGE_REQUEST_COST_PENCE, 5);
});

test('included request does not spend wallet credit', async () => {
  redisResult([1, 40, 0, -1]);
  const result = await consumeUsage({ url: 'https://kv.test', token: 't', identity: 'email:a@test.com', plan: 'free', walletKey: 'stellar:user:a@test.com', allowCredit: true, now: 1_700_000_000_000 });
  assert.equal(result.allowed, true);
  assert.equal(result.chargedCreditPence, 0);
});

test('request after allowance can spend exactly five pence when opted in', async () => {
  redisResult([1, 41, 5, 95]);
  const result = await consumeUsage({ url: 'https://kv.test', token: 't', identity: 'email:a@test.com', plan: 'free', walletKey: 'stellar:user:a@test.com', allowCredit: true, now: 1_700_000_000_000 });
  assert.equal(result.allowed, true);
  assert.equal(result.chargedCreditPence, 5);
  assert.equal(result.walletPence, 95);
});

test('failed paid overage can refund reserved credit', async () => {
  redisResult(100);
  const wallet = await refundUsageCredit({ url: 'https://kv.test', token: 't', walletKey: 'stellar:user:a@test.com', amountPence: 5, now: 1_700_000_000_000 });
  assert.equal(wallet, 100);
  assert.match(chat, /creditChargedPence > 0 && !streamCompleted/);
  assert.match(chat, /refundUsageCredit/);
});

test('wallet deduction stays atomic', () => {
  assert.ok(usageSource.includes("redis.call('INCR', KEYS[1])"));
  assert.ok(usageSource.includes('user.walletPence = wallet - cost'));
  assert.ok(usageSource.includes("redis.call('SET', KEYS[2], cjson.encode(user))"));
});

test('client makes overage opt-in and sends the choice to server', () => {
  assert.match(app, /Use wallet credit after included allowance/);
  assert.match(app, /Overage credit is opt-in/);
  assert.match(app, /Credit does not raise your hourly limit/);
  assert.match(app, /function creditsOn\(\)/);
  assert.match(app, /use_credit:creditsOn\(\)/);
});
