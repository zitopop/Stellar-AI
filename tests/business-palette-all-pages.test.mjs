import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const support = fs.readFileSync(new URL('../support.html', import.meta.url), 'utf8');
const business = fs.readFileSync(new URL('../stellar-business-palette.css', import.meta.url), 'utf8');

test('public pages load the current first-party visual assets', () => {
  assert.match(index, /\/lib\/assets\/homepage\.css\?v=/);
  assert.doesNotMatch(app, /stellar-chatgpt-layout\.css\?v=4/);
  assert.doesNotMatch(app, /stellar-app-landing-ui\.css\?v=1/);
  assert.doesNotMatch(app, /stellar-cosmic-openai\.css\?v=20260923-openai-space/);
  assert.match(app, /--accent:#8b7cf6/);
  assert.match(app, /background:radial-gradient/);
  assert.match(support, /Support centre/i);
});

test('shared business palette still defines Stellar product tokens', () => {
  assert.match(business, /--stellar-bg:/);
  assert.match(business, /--accent:/);
  assert.match(business, /--stellar-panel:/);
});
