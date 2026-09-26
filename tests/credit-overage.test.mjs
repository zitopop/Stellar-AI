import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MODEL_CREDIT_COSTS, OVERAGE_REQUEST_COST_PENCE, getPlanDefinition } from '../lib/pricing.js';
import { consumeUsage, refundUsageCharge } from '../lib/usage.js';

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

test('credit bundles and model costs are server-owned', () => {
  assert.equal(OVERAGE_REQUEST_COST_PENCE, 5);
  assert.deepEqual(MODEL_CREDIT_COSTS, { spark:2, star:5, comet:10, nova:20 });
  assert.equal(getPlanDefinition('free').includedCredits, 300);
  assert.equal(getPlanDefinition('starter').includedCredits, 4000);
  assert.equal(getPlanDefinition('plus').includedCredits, 12000);
  assert.equal(getPlanDefinition('pro').includedCredits, 48000);
});

test('included request does not spend wallet credit', async () => {
  redisResult([1, 5, 5, 0, -1]);
  const result = await consumeUsage({ url: 'https://kv.test', token: 't', identity: 'email:a@test.com', plan: 'free', walletKey: 'stellar:user:a@test.com', allowCredit: true, creditCost: 5, now: 1_700_000_000_000 });
  assert.equal(result.allowed, true);
  assert.equal(result.chargedCreditPence, 0);
  assert.equal(result.includedCreditsCharged, 5);
});

test('request after allowance can spend exactly five pence when opted in', async () => {
  redisResult([1, 300, 0, 5, 95]);
  const result = await consumeUsage({ url: 'https://kv.test', token: 't', identity: 'email:a@test.com', plan: 'free', walletKey: 'stellar:user:a@test.com', allowCredit: true, now: 1_700_000_000_000 });
  assert.equal(result.allowed, true);
  assert.equal(result.chargedCreditPence, 5);
  assert.equal(result.walletPence, 95);
});

test('failed generation can refund included and add-on credits', async () => {
  redisResult([295,100]);
  const refund = await refundUsageCharge({ url:'https://kv.test', token:'t', counterKey:'stellar:credits:test', walletKey:'stellar:user:a@test.com', includedCredits:5, amountPence:5, now:1_700_000_000_000 });
  assert.equal(refund.usedCredits,295);
  assert.equal(refund.walletPence,100);
  assert.match(chat, /includedCreditsCharged > 0/);
  assert.match(chat, /refundUsageCharge/);
});

test('wallet deduction stays atomic', () => {
  assert.ok(usageSource.includes("redis.call('GET', KEYS[1])"));
  assert.ok(usageSource.includes('user.walletPence = wallet - addonCharge'));
  assert.ok(usageSource.includes("redis.call('SET', KEYS[2], cjson.encode(user))"));
});

test('client automatically uses purchased add-on credits after included credits', () => {
  assert.match(app, /Stellar uses included credits first, then bought add-on credits automatically/);
  assert.match(app, /This model costs/);
  assert.match(app, /function creditsOn\(\)/);
  assert.match(app, /use_credit:creditsOn\(\)/);
});
