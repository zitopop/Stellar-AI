import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const business = readFileSync(new URL('../services/business.html', import.meta.url), 'utf8');
const receptionist = readFileSync(new URL('../services/ai-receptionist.html', import.meta.url), 'utf8');

test('Stellar tools include the guided missed revenue calculator', () => {
  assert.match(app, /Missed Revenue Calculator/);
  assert.match(app, /data-action="open-revenue-calculator"/);
  assert.match(app, /REVENUE_CALC_STEPS/);
  assert.match(app, /callsPerDay/);
  assert.match(app, /missedRate/);
  assert.match(app, /conversionRate/);
  assert.match(app, /averageValue/);
  assert.match(app, /revenueCalcState/);
});

test('calculator computes day month and year from explicit business assumptions', () => {
  assert.match(app, /const daily=missedCalls\*conversion\*average/);
  assert.match(app, /monthly:daily\*30/);
  assert.match(app, /yearly:daily\*365/);
  assert.match(app, /How Stellar calculated it/);
  assert.match(app, /ESTIMATED REVENUE AT RISK/);
});

test('calculator avoids guaranteed revenue claims and keeps service recommendations scoped', () => {
  assert.match(app, /Nothing here guarantees recovered revenue/);
  assert.match(app, /Revenue at risk.*only an estimate/);
  assert.match(app, /does not promise that an AI receptionist, website or audit will recover this amount/);
  assert.match(app, /AI Receptionist/);
  assert.match(app, /Website Audit/);
  assert.match(app, /Business Website/);
});

test('revenue estimate can be moved into chat without claiming certainty', () => {
  assert.match(app, /revenue-use-chat/);
  assert.match(app, /Do not promise they will recover that amount/);
  assert.match(app, /Revenue estimate added to chat/);
});

test('business sales pages link into the in-app calculator', () => {
  assert.match(business, /href="\/app\?tool=revenue">Calculate missed revenue/);
  assert.match(receptionist, /href="\/app\?tool=revenue">Estimate missed revenue/);
  assert.match(app, /requestedTool==='revenue'/);
});
