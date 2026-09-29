import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('homepage keeps public visual assets while workspace stays self-contained', () => {
  assert.match(index, /href="\/lib\/assets\/homepage\.css\?v=/);
  assert.doesNotMatch(app, /stellar-chatgpt-layout\.css|stellar-app-landing-ui\.css|stellar-cosmic-openai\.css/);
  assert.match(app, /--accent:#9b8cff/);
  assert.match(app, /background:#0b0c10/);
});

test('workspace keeps mobile-safe controls and a visible bottom composer', () => {
  assert.match(app, /touch-action:manipulation/);
  assert.match(app, /@media\(max-width:640px\)/);
  assert.match(app, /@media\(max-width:540px\)/);
  assert.match(app, /grid-template-rows:58px minmax\(0,1fr\) auto/);
  assert.match(app, /\.composer-tool\{width:44px;height:44px;min-height:44px/);
});

test('workspace uses one premium clean shell without reintroducing legacy styles', () => {
  assert.match(app, /What can I help with\?/);
  assert.match(app, /\.panel\{width:min\(640px,100%\);max-height:88dvh/);
  assert.match(app, /\.composer\{/);
  assert.match(app, /data-stellar-clean-app="true"/);
});
