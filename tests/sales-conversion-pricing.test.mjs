import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('homepage pricing uses a clear sales ladder', () => {
  assert.match(index, /Pick the plan by the job you want done\./);
  assert.match(index, /Try the workspace/);
  assert.match(index, /Upgrade when limits matter/);
  assert.match(index, /Keep control/);
});

test('Plus is positioned as the main paid conversion plan', () => {
  assert.match(index, /data-plan="plus"/);
  assert.match(index, /MOST POPULAR/);
  assert.match(index, /BEST VALUE/);
  assert.match(index, /Best upgrade for most paying users/);
  assert.match(app, /Plus is best value for daily work/);
  assert.match(app, /Plus £20 · Best value/);
});
