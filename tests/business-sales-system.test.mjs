import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const business = readFileSync(new URL('../services/business.html', import.meta.url), 'utf8');
const receptionist = readFileSync(new URL('../services/ai-receptionist.html', import.meta.url), 'utf8');

test('Tools exposes the full business sales system', () => {
  assert.match(app, /Guided Sales Mode/);
  assert.match(app, /data-action="open-sales-mode"/);
  assert.match(app, /Missed Revenue Calculator/);
  assert.match(app, /requestedTool==='sales'/);
});

test('guided sales mode implements the five-stage video-inspired sales flow', () => {
  for (const phrase of [
    'Qualify the pain',
    'Quantify the impact',
    'Match the service',
    'Handle the objection',
    'Agree the next action',
  ]) assert.match(app, new RegExp(phrase));
  assert.match(app, /SALES_STAGES/);
  assert.match(app, /sales-stage-next/);
  assert.match(app, /sales-stage-chat/);
});

test('sales mode includes ROI context without promising returns', () => {
  assert.match(app, /Estimated monthly revenue at risk/);
  assert.match(app, /Receptionist monthly service/);
  assert.match(app, /Context only — not a promised return/);
  assert.match(app, /Never claim guaranteed leads, rankings, revenue recovery or business outcomes/);
});

test('service stack and selectable add-ons use only real Stellar offers', () => {
  for (const phrase of ['AI Receptionist','Business Website','Website Audit','Stellar Workspace']) assert.match(app, new RegExp(phrase));
  assert.match(app, /sales-stack-layer/);
  assert.match(app, /toggle-sales-service/);
  assert.match(app, /selectedSalesServices/);
  assert.match(app, /Use selected stack in chat/);
});

test('objection handling is factual and low-pressure', () => {
  assert.match(app, /A cheaper AI tool can do this/);
  assert.match(app, /£49\/month feels expensive/);
  assert.match(app, /I do not know if I need this/);
  assert.match(app, /Will this replace my staff/);
  assert.match(app, /If the numbers do not support a sale, say so/);
});

test('business pages link directly into calculator and guided sales mode', () => {
  assert.match(business, /href="\/app\?tool=revenue"/);
  assert.match(business, /href="\/app\?tool=sales"/);
  assert.match(business, /Turn the business problem into a clear next step/);
  assert.match(receptionist, /href="\/app\?tool=sales">Open guided sales mode/);
});
