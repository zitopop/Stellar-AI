import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const rewrites = new Map((vercel.rewrites || []).map((route) => [route.source, route.destination]));
const support = readFileSync(new URL('../support.html', import.meta.url), 'utf8');
const terms = readFileSync(new URL('../terms.html', import.meta.url), 'utf8');
const registry = readFileSync(new URL('../lib/plugin-registry.js', import.meta.url), 'utf8');
const manager = readFileSync(new URL('../lib/plugin-manager-handler.js', import.meta.url), 'utf8');

test('public product and business routes resolve to concrete files', () => {
  const expected = {
    '/plans':'/plans.html',
    '/models':'/models.html',
    '/privacy':'/privacy.html',
    '/terms':'/terms.html',
    '/support':'/support.html',
    '/refunds':'/refunds.html',
    '/legal':'/legal.html',
    '/blog':'/blog.html',
    '/desktop':'/desktop-agent.html',
    '/business':'/services/business.html',
    '/website-audit':'/services/website-audit.html',
    '/ai-receptionist':'/services/ai-receptionist.html',
    '/email-agent':'/email-agent.html',
    '/roblox-studio':'/roblox-studio.html',
    '/small-business-ai':'/small-business-ai/index.html',
    '/ai-inbox-closer':'/ai-inbox-closer/index.html',
  };
  for (const [source, destination] of Object.entries(expected)) {
    assert.equal(rewrites.get(source), destination, source + ' should map to ' + destination);
  }
});

test('public support contact uses the current address', () => {
  assert.match(support, /deadlyfox10@gmail\.com/);
  assert.doesNotMatch(support, /support@trystellarai\.com/);
});

test('terms use customer-facing Stellar model names only', () => {
  assert.match(terms, /Stellar Fast/);
  assert.match(terms, /Stellar Core/);
  assert.match(terms, /Stellar Deep/);
  assert.match(terms, /Stellar Max/);
  assert.doesNotMatch(terms, /\b(?:Spark|Star|Comet|Nova)\b/);
});

test('plugins keep internal access naming out of public response fields', () => {
  assert.match(registry, /audience:plugin\.audience==='owner'\?'restricted':plugin\.audience/);
  assert.match(manager, /viewer:\{signedIn:true,privateAccess:isOwner===true\}/);
  assert.doesNotMatch(manager, /viewer:\{signedIn:true,owner:isOwner===true\}/);
});
