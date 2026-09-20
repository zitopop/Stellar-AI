import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../app.html', import.meta.url), 'utf8');

test('home focus pass removes starter clutter and keeps one clear composer', () => {
  assert.match(app, /id="stellar-home-focus-v8"/);
  assert.match(app, /#welcome-starters-heading,[\s\S]*#suggestion-chips[\s\S]*display:none!important/);
  assert.match(app, /#composer-model-trigger,[\s\S]*#composer-plans-btn[\s\S]*display:none!important/);
  assert.match(app, /width:min\(100%,768px\)!important/);
});

test('home focus pass keeps the model visible in the header and removes starfield noise', () => {
  assert.match(app, /\.stellar-global-header \.topbar-model-picker #model-btn/);
  assert.match(app, /body:not\(\.light\) #main-col::before,[\s\S]*display:none!important/);
});

test('home focus pass preserves responsive touch sizing and compact plans', () => {
  assert.match(app, /@media\(max-width:767px\)/);
  assert.match(app, /\.input-area #send-btn[\s\S]*min-width:44px!important/);
  assert.match(app, /#plans-modal \.plans-choice-guide\{display:none!important\}/);
});
