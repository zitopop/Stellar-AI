import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('successful health HTTP response is not presented as verified phone readiness', async () => {
  const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
  const code = app.slice(app.indexOf('async function checkOwnerCallHealth()'), app.indexOf('function addMessage(', app.indexOf('async function checkOwnerCallHealth()')));
  const label = { textContent: '' }; let result = { ok: true, ready: false };
  const context = vm.createContext({ $: () => label, isOwner: () => true, ownerRequest: async () => result, setStatus() {} });
  vm.runInContext(code, context);
  assert.equal(await context.checkOwnerCallHealth(), false);
  assert.equal(label.textContent, 'Phone service configured but not ready');
  result = { ok: true, ready: true };
  assert.equal(await context.checkOwnerCallHealth(), true);
  assert.equal(label.textContent, 'Phone service ready');
});
