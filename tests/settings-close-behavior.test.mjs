import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../stellar-settings-v22.css', import.meta.url), 'utf8');

test('Settings closes from backdrop, Escape and explicit close button', () => {
  assert.match(app, /id="settings-panel"[^>]*onclick="closeSettingsOnBackdrop\(event\)"/);
  assert.match(app, /function closeSettingsOnBackdrop\(event\)\{if\(event\?\.target===event\?\.currentTarget\)closeSettings\(\)\}/);
  assert.match(app, /class="settings-close-x"[^>]*onclick="closeSettings\(\)"/);
  assert.match(app, /if\(e\.key==='Escape'\)[\s\S]*?closeSettings\(\)/);
});

test('Settings returns keyboard focus after dismissal', () => {
  assert.match(app, /let settingsReturnFocus=null/);
  assert.match(app, /settingsReturnFocus=document\.activeElement instanceof HTMLElement/);
  assert.match(app, /panel\.querySelector\('\.settings-close-x'\)\?\.focus/);
  assert.match(app, /target&&document\.contains\(target\)/);
});

test('Settings close control is touch safe and visibly focusable', () => {
  assert.match(app, /class="settings-close-x"[\s\S]*?class="settings-close-icon"/);
  assert.match(app, /viewBox="0 0 24 24"/);
  assert.match(css, /\.settings-close-x\{[\s\S]*?width:44px!important;[\s\S]*?height:44px!important/);
  assert.match(css, /\.settings-close-icon\{[\s\S]*?width:19px!important/);
  assert.match(css, /touch-action:manipulation!important/);
  assert.match(css, /\.settings-close-x:focus-visible/);
});
