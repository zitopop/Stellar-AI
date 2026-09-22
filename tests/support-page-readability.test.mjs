import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const support = readFileSync(new URL('../support.html', import.meta.url), 'utf8');

test('support page keeps text, chips and buttons readable on dark backgrounds', () => {
  assert.match(support, /Final support readability pass/);
  assert.match(support, /support-white-text-final/);
  assert.match(support, /body, main, \.hero, \.grid, \.card[\s\S]*?color:#fff!important/);
  assert.match(support, /\.btn\{[\s\S]*?color:#fff!important/);
  assert.match(support, /\.chip\{[\s\S]*?color:#f5f7ff!important[\s\S]*?background:#151c35!important/);
  assert.match(support, /\.card h2,\.item b,\.btn,\.chip,\.search button\{color:#fff!important/);
  assert.match(support, /\.hero p,\.card p,\.ticks,\.navlinks a,\.item span,footer,\.foot,\.search input::placeholder\{color:var\(--muted\)!important/);
});

test('support quick actions are real clickable controls with icons and target sections', () => {
  assert.ok(support.includes('class="chip" href="#plans-billing" onclick="quick(\'billing\',\'plans-billing\')"'));
  assert.ok(support.includes('💳 Billing'));
  assert.ok(support.includes('📚 Open Help Guides'));
  for (const id of ['plans-billing','account-help','script-help']) assert.match(support, new RegExp('id="' + id + '"'));
  assert.match(support, /function quick\(q,target\)/);
  assert.ok(support.includes("scrollIntoView({behavior:'smooth',block:'center'})"));
  assert.match(support, /\.chip,\.btn,\.search button,\.item\{cursor:pointer!important;pointer-events:auto!important/);
});
