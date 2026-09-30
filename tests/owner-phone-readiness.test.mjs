import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('successful health HTTP response is not presented as verified phone readiness unless ready is true', () => {
  const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
  assert.match(app, /const ready=data\?\.ready===true/);
  assert.match(app, /const verified=ready&&!needsVerification/);
  assert.match(app, /verified\?'Phone service ready'/);
  assert.match(app, /return verified/);
  assert.match(app, /Phone service unavailable/);
});
