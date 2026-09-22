import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appHtml = await readFile(new URL('../app.html', import.meta.url), 'utf8');

test('home copy stays focused without quick-start clutter', () => {
  assert.ok(appHtml.includes('What can I help you with?'));
  assert.ok(appHtml.includes('Build something new, fix a problem, improve a project, or ask Stellar anything.'));
  assert.match(appHtml, /placeholder="Ask Stellar anything…"/);
  assert.equal((appHtml.match(/class="sug-chip"/g) || []).length, 0);
});

test('the redundant ready-to-build helper is removed from the home screen', () => {
  assert.doesNotMatch(appHtml, /id="starter-ready"/);
  assert.doesNotMatch(appHtml, />Ready to build\. Review the prompt, then press Send\.<\/span>/);
});
