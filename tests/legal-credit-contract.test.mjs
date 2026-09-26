import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const terms = readFileSync(new URL('../terms.html', import.meta.url), 'utf8');
const privacy = readFileSync(new URL('../privacy.html', import.meta.url), 'utf8');

test('terms explain the current Stellar Credits plan model', () => {
  for (const text of ['300 credits per day','4,000 credits per month','12,000 credits per month','48,000 credits per month']) assert.ok(terms.includes(text), text);
  assert.match(terms, /2 credits on Spark, 5 credits on Star, 10 credits on Comet and 20 credits on Nova/);
  assert.match(terms, /StellarX AI planning pass currently costs 20 credits/);
  assert.match(terms, /Unused included plan credits do not roll over/);
});

test('terms explain wallet packs, bonus credits and automatic fallback', () => {
  for (const text of ['£10 for 1,100 credits','£25 for 2,875 credits','£50 for 6,000 credits','£100 for 12,000 credits','£200 for 24,000 credits']) assert.ok(terms.includes(text), text);
  assert.match(terms, /automatically uses available bought wallet credits/);
  assert.match(terms, /Bought wallet credits currently remain on the account until used/);
  assert.match(terms, /same successful checkout is not intentionally credited twice/);
});

test('terms explain welcome and referral promotional credits', () => {
  assert.match(terms, /100 welcome credits/);
  assert.match(terms, /100 promotional credits to the referred new account and 100 promotional credits to the referrer/);
});

test('terms no longer publish the retired request-hour allowance as customer plan value', () => {
  assert.doesNotMatch(terms, /hourly request allowances are 40, 120, 400, and 1,600/i);
  assert.doesNotMatch(terms, /£1 promotional credit/);
});

test('privacy describes Stellar Credits and bonus metadata', () => {
  assert.match(privacy, /Plan, Stellar Credits and billing status/);
  assert.match(privacy, /included-credit usage/);
  assert.match(privacy, /top-up amount and bonus/);
  assert.match(privacy, /applicable bonus-credit metadata/);
});