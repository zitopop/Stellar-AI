import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('successful health HTTP response is not presented as verified phone readiness unless ready is true', () => {
  const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
  assert.match(app, /const ready=data\?\.ready===true/);
  assert.match(app, /ready\?'Phone service ready':'Phone service configured but not ready'/);
  assert.match(app, /return ready/);
  assert.match(app, /Phone service unavailable/);
});
