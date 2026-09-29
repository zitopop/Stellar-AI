import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('third-party font CSS does not block Stellar app startup', () => {
  assert.doesNotMatch(app, /fonts\.googleapis\.com/);
  assert.doesNotMatch(app, /@import\s+url\(/);
  assert.match(app, /font:15px\/1\.5 Inter,Manrope,system-ui/);
});
