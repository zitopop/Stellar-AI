import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../app.html', import.meta.url), 'utf8');

test('app home hero uses the refined build-next copy in both initial and regenerated home states', () => {
  const heading = 'What will you <span class="greet-hi-accent">build next?</span>';
  assert.equal(app.split(heading).length - 1, 2);
  assert.match(app, /Turn your next FiveM or Roblox idea into something real — build it, fix it, and keep improving it with Stellar\./);
  assert.doesNotMatch(app, /What do you want to <span class="greet-hi-accent">build\?<\/span>/);
});
