import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../app.html', import.meta.url), 'utf8');
const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('app uses the current calm dark violet accent system', () => {
  assert.match(app, /--accent:#8b7cf6/);
  assert.match(app, /--accent2:#b9b0ff/);
  assert.match(app, /--good:#52d69f/);
  assert.match(app, /background:radial-gradient/);
});

test('public homepage uses dedicated dark theme assets', async () => {
  const css = await readFile(new URL('../lib/assets/homepage.css', import.meta.url), 'utf8');
  assert.match(index, /href="\/lib\/assets\/homepage\.css\?v=/);
  assert.match(css, /color-scheme:\s*dark/);
});

test('business palette keeps approved Stellar brand tokens', async () => {
  const css = await readFile(new URL('../stellar-business-palette.css', import.meta.url), 'utf8');
  assert.match(css, /--stellar-bg:#090b12/);
  assert.match(css, /--stellar-primary:#8b5cf6/);
  assert.match(css, /--stellar-text:#f7f8fc/);
  assert.match(index, /stellar-business-palette\.css\?v=8/);
});
