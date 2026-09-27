import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (name) => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const builder = read('business-builder.html');
const business = read('services/business.html');
const vercel = JSON.parse(read('vercel.json'));

test('business website builder has a clean public route', () => {
  assert.ok((vercel.rewrites || []).some((r) => r.source === '/business-builder' && r.destination === '/business-builder.html'));
  assert.ok((vercel.redirects || []).some((r) => r.source === '/business-builder.html' && r.destination === '/business-builder' && r.permanent === true));
});

test('builder uses Stellar AI and requires approval before publishing', () => {
  assert.match(builder, /fetch\('\/api\/chat'/);
  assert.match(builder, /model:'star'/);
  assert.match(builder, /role:'implementer'/);
  assert.match(builder, /Approval first/);
  assert.match(builder, /will not publish to a real domain/);
});

test('generated websites are previewed through a constrained iframe and sanitized', () => {
  assert.match(builder, /sandbox="allow-popups"/);
  assert.match(builder, /replace\(\/<script/);
  assert.match(builder, /javascript\\s\*:/);
  assert.match(builder, /Download site/);
  assert.match(builder, /Copy HTML/);
});

test('business services surface the builder separately from the paid audit', () => {
  assert.match(business, /AI Website Builder/);
  assert.match(business, /href="\/business-builder"/);
  assert.match(business, /£99 one-time/);
});
