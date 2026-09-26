import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('homepage pricing uses a clear conversion ladder', () => {
  assert.match(index, /Start free\. Upgrade when Stellar starts saving you time\./);
  assert.match(index, /Try real work for free/);
  assert.match(index, /Upgrade for momentum/);
  assert.match(index, /Keep it flexible/);
  assert.match(index, /Save 30% yearly/);
});

test('Plus is positioned as the main paid conversion plan', () => {
  assert.match(index, /data-plan="plus"/);
  assert.match(index, /MOST POPULAR/);
  assert.match(index, /RECOMMENDED/);
  assert.match(index, /Recommended for most people who use Stellar every day/);
  assert.match(app, /Plus is recommended for daily work/);
  assert.match(app, /Plus £20 · Recommended/);
});
