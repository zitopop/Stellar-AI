import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('home page uses external CSS and keeps app route separate', () => {
  assert.match(index, /\/lib\/assets\/homepage\.css\?v=/);
  assert.match(index, /href="\/app\?welcome=1"|href="\/app"/);
  assert.doesNotMatch(index, /<script[^>]+src="https:\/\/cdn\.tailwindcss\.com/i);
});

test('workspace only loads the required external identity script', () => {
  assert.match(app, /accounts\.google\.com\/gsi\/client/);
  assert.doesNotMatch(app, /cdn\.tailwindcss\.com/);
});
