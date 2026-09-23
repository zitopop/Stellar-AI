import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const landing = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../stellar-chatgpt-layout.css', import.meta.url), 'utf8');

test('workspace uses the focused ChatGPT-inspired Stellar shell', () => {
  assert.match(app, /stellar-chatgpt-layout\.css\?v=4/);
  assert.match(css, /\.stellar-global-header\{display:none!important\}/);
  assert.match(css, /#chats-list\{display:block!important/);
  assert.match(css, /\.stellar-v2-badge,\.stellar-feature-grid/);
  assert.match(css, /width:min\(100%,768px\)!important/);
});

test('plans explain included allowance and separate wallet credit', () => {
  assert.match(app, /Plans and credit do different jobs\./);
  for (const allowance of ['40 requests/hour', '120 requests/hour', '400 requests/hour', '1,600 requests/hour']) assert.match(app, new RegExp(allowance.replace(',', ',')));
  assert.equal((app.match(/class="plan-usage-pill"/g) || []).length, 4);
});

test('landing uses a conversational Stellar entry and plan-limit guidance', () => {
  assert.match(landing, /Build it\. Debug it\. Keep moving\./);
  assert.match(landing, /AI coding workspace for FiveM and Roblox/);
  assert.match(landing, /Message Stellar AI/);
  assert.match(landing, /Roblox Studio Agent/);
  assert.match(landing, /PC Agent/);
  assert.match(landing, /Wallet credit is separate and can be used after the included allowance\./);
  assert.match(landing, /Prices and checkout are in GBP/);
});
