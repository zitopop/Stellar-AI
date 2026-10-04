import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const business = readFileSync(new URL('../services/business.html', import.meta.url), 'utf8');
const audit = readFileSync(new URL('../services/website-audit.html', import.meta.url), 'utf8');
const receptionist = readFileSync(new URL('../services/ai-receptionist.html', import.meta.url), 'utf8');
const builder = readFileSync(new URL('../business-builder.html', import.meta.url), 'utf8');

test('main landing page exposes a clear For Business route without replacing developer positioning', () => {
  assert.match(home, /href="\/business">For Business/);
  assert.match(home, /id="business"/);
  assert.match(home, /STELLAR FOR BUSINESS/);
  assert.match(home, /Not just for developers/);
  assert.match(home, /Generate & Debug FiveM and Roblox Scripts/);
});

test('landing business bridge shows the real current service catalogue and prices', () => {
  assert.match(home, /AI Receptionist/);
  assert.match(home, /£150 setup \+ £49\/month/);
  assert.match(home, /Website Audit \/ Quick Fix/);
  assert.match(home, /£99 one-time/);
  assert.match(home, /AI Business Website/);
  assert.match(home, /Stellar AI Workspace/);
});

test('landing business bridge links directly into revenue and guided sales tools', () => {
  assert.match(home, /href="\/app\?tool=revenue">Calculate missed revenue/);
  assert.match(home, /href="\/app\?tool=sales">Open Guided Sales Mode/);
  assert.match(home, /Business results are not guaranteed/);
});

test('business service pages share the same sales funnel entry points', () => {
  assert.match(business, /href="\/app\?tool=revenue"/);
  assert.match(business, /href="\/app\?tool=sales"/);
  assert.match(receptionist, /href="\/app\?tool=revenue"/);
  assert.match(receptionist, /href="\/app\?tool=sales"/);
  assert.match(audit, /href="\/app\?tool=revenue"/);
  assert.match(audit, /href="\/app\?tool=sales"/);
  assert.match(builder, /href="\/app\?tool=revenue"/);
  assert.match(builder, /href="\/app\?tool=sales"/);
});

test('business funnel keeps clear no-guarantee safeguards', () => {
  assert.match(home, /Business results are not guaranteed/);
  assert.match(business, /Do you guarantee more leads, rankings or revenue\?/);
  assert.match(audit, /no guaranteed rankings, leads or revenue/i);
  assert.match(receptionist, /should not invent discounts, availability, prices, refunds, contractual terms/i);
  assert.match(builder, /AI can make mistakes, so review the preview before using it commercially/);
});
