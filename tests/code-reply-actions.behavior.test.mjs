import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('code replies expose useful review and multi-file copy actions', () => {
  assert.match(app, /data-message-action="review-code"/);
  assert.match(app, /data-message-action="copy-all-code"/);
  assert.match(app, /async function reviewAssistantCode\(/);
  assert.match(app, /async function copyAllAssistantCode\(/);
  assert.match(app, /code-review-started/);
  assert.match(app, /All code copied/);
  assert.match(app, /Code review is available on the latest reply/);
});
