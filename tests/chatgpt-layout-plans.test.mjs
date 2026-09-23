import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const landing = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('workspace uses the self-contained modern Stellar shell without legacy gold overrides', () => {
  assert.doesNotMatch(app, /stellar-chatgpt-layout\.css/);
  assert.doesNotMatch(app, /stellar-app-landing-ui\.css/);
  assert.doesNotMatch(app, /stellar-cosmic-openai\.css/);
  assert.match(app, /--accent:#8b7cf6/);
  assert.match(app, /--accent2:#b9b0ff/);
  assert.match(app, /\.composer-wrap\{position:sticky;bottom:0;z-index:9/);
  assert.match(app, /\.chat\{min-width:0;min-height:0;overflow:auto/);
});

test('plan and wallet detail is kept in Settings instead of cluttering the sidebar', () => {
  assert.match(app, /id="plan-truth">Plan and usage/);
  assert.match(app, /id="usage-copy">Plan data loads after sign-in/);
  assert.equal((app.match(/class="plan-usage-pill"/g) || []).length, 0);
  assert.match(app, /Compare plans/);
});

test('landing uses a conversational Stellar entry and plan-limit guidance', () => {
  assert.match(landing, /AI systems for real business work\./);
  assert.match(landing, /BUSINESS AI[\s\S]*AUTOMATION[\s\S]*AGENTS[\s\S]*SOFTWARE WORKSPACE/);
  assert.match(landing, /Message Stellar AI/);
  assert.match(landing, /Roblox Studio Agent/);
  assert.match(landing, /PC Agent/);
  assert.match(landing, /Wallet credit is separate from the included hourly allowance/);
  assert.match(landing, /Prices and checkout are in GBP/);
});


