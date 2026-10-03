import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('app shell never renders escaped newline text around external assets', () => {
  assert.equal(app.includes('stellar-call.css?v=20260924-1">\\n'), false);
  assert.equal(app.includes('stellar-call.js?v=20260925-voiceguard"></script>\\n</body>'), false);
});