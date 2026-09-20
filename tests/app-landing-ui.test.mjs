import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../app.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../stellar-app-landing-ui.css', import.meta.url), 'utf8');

test('app loads the landing-page visual system after the legacy layers', () => {
  assert.match(app, /stellar-app-landing-ui\.css\?v=1/);
  assert.match(app, /family=DM\+Mono[^"]*Manrope/);
  assert.match(app, /theme-color" content="#09090e"/);
});

test('landing app theme reuses the public homepage palette and hero treatment', () => {
  assert.match(css, /--landing-bg:#09090e/);
  assert.match(css, /--landing-purple:#b5a0f7/);
  assert.match(css, /\.landing-style-home \.greet-eyebrow\{/);
  assert.match(css, /linear-gradient\(110deg,#e2d4ff 10%,#b6a0f0 53%,#9c7ae0\)/);
  assert.match(css, /#welcome-starters-heading,[\s\S]*#suggestion-chips[\s\S]*display:none!important/);
});

test('landing app theme keeps core workspace controls visible and touch safe', () => {
  assert.match(css, /#sidebar \.stellar-sidebar-nav\{[\s\S]*display:grid!important/);
  assert.match(css, /\.input-area #send-btn\{[\s\S]*min-width:42px!important/);
  assert.match(css, /@media\(max-width:767px\)[\s\S]*min-width:44px!important/);
  assert.match(css, /#account-box \.acct-signin-btn/);
  assert.match(css, /#account-box \.acct-out-btn/);
});
