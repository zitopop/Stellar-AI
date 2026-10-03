import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('main chat consumes the server stream incrementally', () => {
  assert.match(app, /async function streamReply\(response,onDelta\)/);
  assert.match(app, /response\.body\.getReader\(\)/);
  assert.match(app, /await streamReply\(res,delta=>\{/);
  assert.match(app, /answer\+=delta/);
  assert.doesNotMatch(app, /const raw=await res\.text\(\);if\(!res\.ok\)/);
});

test('generation can be stopped without losing a partial answer', () => {
  assert.match(app, /currentGenerationController=new AbortController\(\)/);
  assert.match(app, /signal:currentGenerationController\.signal/);
  assert.match(app, /currentGenerationController\?\.abort\(\)/);
  assert.match(app, /err\?\.name==='AbortError'/);
  assert.match(app, /setStatus\('Stopped','warn'\)/);
});

test('composer grows with typed content and send button becomes stop control', () => {
  assert.match(app, /function resizePrompt\(\)/);
  assert.match(app, /prompt\.addEventListener\('input',resizePrompt\)/);
  assert.match(app, /sendBtn\.textContent=active\?'■':'↑'/);
  assert.match(app, /const label=active\?'Stop generating':'Send message'/);
  assert.match(app, /setAttribute\('aria-label',label\)/);
});
