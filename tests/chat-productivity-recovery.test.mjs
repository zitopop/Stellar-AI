import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('assistant replies expose compact copy and latest-reply regenerate actions', () => {
  assert.match(app, /function copyAssistantResponse\(button\)/);
  assert.match(app, /data-message-action="regenerate"/);
  assert.match(app, /function regenerateAssistantResponse\(button\)/);
  assert.match(app, /Regenerate is available on the latest reply/);
  assert.match(app, /addAssistantActions\(reply\.closest\('\.msg\.assistant'\),reply\)/);
});

test('current chat can be exported locally without a server upload', () => {
  assert.match(app, /id="export-chat-btn"/);
  assert.match(app, /function exportCurrentChat\(\)/);
  assert.match(app, /new Blob\(\[body\],\{type:'text\/markdown;charset=utf-8'\}\)/);
  assert.match(app, /link\.download=.*\.md/);
});

test('offline state prevents accidental sends and recovers visibly', () => {
  assert.match(app, /navigator\.onLine===false/);
  assert.match(app, /messages will not send until you reconnect/);
  assert.match(app, /window\.addEventListener\('offline',syncConnectivity\)/);
  assert.match(app, /window\.addEventListener\('online',syncConnectivity\)/);
  assert.match(app, /Back online\./);
});

test('command-k focuses the composer without adding another modal', () => {
  assert.match(app, /\(e\.ctrlKey\|\|e\.metaKey\).*e\.key\.toLowerCase\(\)==='k'/);
  assert.match(app, /\$\('prompt'\)\?\.focus\(\)/);
});
