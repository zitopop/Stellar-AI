import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('third-party fonts do not block Stellar app startup', () => {
  assert.match(app, /rel="preload" as="style" href="https:\/\/fonts\.googleapis\.com/);
  assert.match(app, /onload="this\.onload=null;this\.rel='stylesheet'"/);
  assert.match(app, /<noscript><link href="https:\/\/fonts\.googleapis\.com[^>]+rel="stylesheet"><\/noscript>/);
});
