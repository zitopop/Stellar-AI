import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const landing = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('workspace uses the self-contained modern Stellar shell without legacy overrides', () => {
  assert.doesNotMatch(app, /stellar-chatgpt-layout\.css|stellar-app-landing-ui\.css|stellar-cosmic-openai\.css/);
  assert.match(app, /--accent:#9b8cff/);
  assert.match(app, /--accent2:#f0edff/);
  assert.match(app, /\.main\{min-width:0;height:100dvh;display:grid;grid-template-rows:58px minmax\(0,1fr\) auto/);
  assert.match(app, /\.chat\{min-height:0;height:100%;overflow:auto/);
});

test('plan and wallet detail lives in account panels instead of sidebar clutter', () => {
  assert.match(app, /function renderPlansPanel\(\)/);
  assert.match(app, /function renderCreditsPanel\(\)/);
  assert.match(app, /Compare all 4 plans/);
  assert.match(app, /Bought wallet credits take over automatically/);
  assert.doesNotMatch(app, /class="plan-usage-pill"/);
});

test('landing uses a concise conversational entry with clear pricing access', () => {
  assert.match(landing, /Ask anything\.<br>Get real work done\./);
  assert.match(landing, /Message Stellar AI/);
  assert.match(landing, /Plans from £8\/month/);
  assert.match(landing, /Prices and checkout are in GBP/);
});
