import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('owner tools expose a Jarvis command centre', () => {
  assert.match(app, /data-otab="jarvis"/);
  assert.match(app, /data-opanel="jarvis"/);
  assert.match(app, /Jarvis command centre/);
  assert.match(app, /Safety mode/);
});

test('Jarvis command centre provides focused business missions', () => {
  for (const label of ['Revenue day', 'Sales sprint', 'Fix systems', 'Social growth', 'Inbox sweep', 'Full brief']) {
    assert.ok(app.includes(label), `missing mission: ${label}`);
  }
  assert.match(app, /function runJarvisMission\(prompt\)/);
  assert.match(app, /sendMessage\(\)/);
});

test('Jarvis command centre reports voice and owner-call health without exposing secrets', () => {
  assert.match(app, /function refreshJarvisCenter\(\)/);
  assert.match(app, /checkOwnerCallHealth\(\)/);
  assert.match(app, /Configured — provider test pending/);
  assert.doesNotMatch(app, /RETELL_API_KEY\s*=/);
  assert.doesNotMatch(app, /CALL_BRIDGE_TOKEN\s*=/);
});
