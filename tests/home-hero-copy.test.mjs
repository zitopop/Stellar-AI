import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../app.html', import.meta.url), 'utf8');

test('app home hero uses the current help-first copy in static and regenerated home states', () => {
  assert.match(app, /<div class="greet-hi" id="greet-hi">What can I help you with\?<\/div>/);
  assert.match(app, /const heading = firstName[\s\S]*?: 'What can I help you with\?';/);
  assert.match(app, /<p class="welcome-sub">Build something new, fix a problem, improve a project, or ask Stellar anything\.<\/p>/);
  assert.doesNotMatch(app, /What do you want to <span class="greet-hi-accent">build\?<\/span>/);
});