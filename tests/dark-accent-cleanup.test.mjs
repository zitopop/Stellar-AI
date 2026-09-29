import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const homepage = fs.readFileSync(new URL('../lib/assets/homepage.css', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('current dark theme keeps contrast tokens explicit', () => {
  assert.match(homepage, /--bg:/);
  assert.match(homepage, /--panel:/);
  assert.match(homepage, /--ink:/);
  assert.match(app, /--bg:#0b0c10/);
  assert.match(app, /--panel:#12141c/);
  assert.match(app, /--text:#f7f8fb/);
});
