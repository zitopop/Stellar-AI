import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('homepage keeps public visual layers while workspace stays self-contained', () => {
  assert.match(index, /href="\/lib\/assets\/homepage\.css\?v=/);
  assert.doesNotMatch(app, /stellar-chatgpt-layout\.css/);
  assert.doesNotMatch(app, /stellar-app-landing-ui\.css/);
  assert.doesNotMatch(app, /stellar-cosmic-openai\.css/);
  assert.match(app, /--accent:#8b7cf6/);
  assert.match(app, /radial-gradient/);
});

test('workspace keeps mobile-safe controls and a visible bottom composer', () => {
  assert.match(app, /touch-action:manipulation/);
  assert.match(app, /@media\(max-width:640px\)/);
  assert.match(app, /@media\(max-width:420px\)/);
  assert.match(app, /\.composer-wrap\{position:sticky;bottom:0;z-index:9/);
  assert.match(app, /\.composer-tool\{min-height:36px/);
  assert.match(app, /@media\(max-width:640px\)[\s\S]*?\.composer-tool\{min-height:44px\}/);
});
