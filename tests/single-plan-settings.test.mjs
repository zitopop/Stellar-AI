import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const plans = readFileSync(new URL('../plans.html', import.meta.url), 'utf8');

test('Settings has one plan entry and one canonical comparison link', () => {
  assert.equal((app.match(/data-action="open-plans"/g) || []).length, 1);
  assert.match(app, /<strong>Plans<\/strong><small>'\+escapeHtml\(planState\.name\)/);
  assert.match(app, /Compare all 4 plans/);
  assert.match(app, /href="\/plans"/);
});

test('the canonical plans page still contains all four subscription tiers', () => {
  for (const name of ['Free','Starter','Plus','Pro']) assert.match(plans, new RegExp('<h2>'+name+'<\\/h2>'));
});
