import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const support = fs.readFileSync(new URL('../support.html', import.meta.url), 'utf8');
const business = fs.readFileSync(new URL('../stellar-business-palette.css', import.meta.url), 'utf8');

test('public landing and clean app keep current first-party visual assets', () => {
  assert.match(index, /\/lib\/assets\/homepage\.css\?v=/);
  assert.doesNotMatch(app, /stellar-chatgpt-layout\.css|stellar-app-landing-ui\.css|stellar-cosmic-openai\.css/);
  assert.match(app, /--accent:#9b8cff/);
  assert.match(app, /background:var\(--bg\)/);
  assert.match(support, /Support centre/i);
});

test('shared business palette still defines Stellar product tokens', () => {
  assert.match(business, /--stellar-bg:/);
  assert.match(business, /--accent:/);
  assert.match(business, /--stellar-panel:/);
});
