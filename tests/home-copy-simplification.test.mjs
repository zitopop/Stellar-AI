import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appHtml = await readFile(new URL('../app.html', import.meta.url), 'utf8');

test('home copy stays focused without quick-start clutter', () => {
  assert.match(appHtml, /What do you want to <span class="greet-hi-accent">build\?<\/span>/);
  assert.match(appHtml, /Build, fix, and improve FiveM or Roblox systems from one clear prompt\./);
  assert.match(appHtml, /placeholder="Ask Stellar anything…"/);
  assert.equal((appHtml.match(/class="sug-chip"/g) || []).length, 0);
});

test('the redundant ready-to-build helper is removed from the home screen', () => {
  assert.doesNotMatch(appHtml, /id="starter-ready"/);
  assert.doesNotMatch(appHtml, />Ready to build\. Review the prompt, then press Send\.<\/span>/);
});
