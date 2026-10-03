import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const currency = fs.readFileSync(new URL('../currency.js', import.meta.url), 'utf8');
const extensionJs = fs.readFileSync(new URL('../stellar-settings-extensions.js', import.meta.url), 'utf8');
const extensionCss = fs.readFileSync(new URL('../stellar-settings-extensions.css', import.meta.url), 'utf8');

test('Settings extension runtime parses as JavaScript', () => {
  assert.doesNotThrow(() => new Function(extensionJs));
});

test('currency loader includes the isolated Settings extension assets', () => {
  assert.match(currency, /stellar-settings-extensions\.css\?v=1/);
  assert.match(currency, /stellar-settings-extensions\.js\?v=1/);
  assert.doesNotMatch(currency, /script\.src = '\/stellar-orbit\.js/);
});

test('Settings extensions avoid self-triggering render loops', () => {
  assert.doesNotMatch(extensionJs, /MutationObserver/);
  assert.doesNotMatch(extensionJs, /setInterval\s*\(/);
  assert.doesNotMatch(extensionJs, /requestAnimationFrame\s*\(/);
});

test('Settings extension API supports future first-party sections', () => {
  assert.match(extensionJs, /window\.StellarSettingsExtensions = Object\.freeze/);
  assert.match(extensionJs, /registerSection/);
  assert.match(extensionJs, /getPreferences/);
  assert.match(extensionJs, /setPreferences/);
});

test('Preferences include density, code wrapping and reduced motion', () => {
  assert.match(extensionJs, /sidebarDensity/);
  assert.match(extensionJs, /codeWrap/);
  assert.match(extensionJs, /reducedMotion/);
  assert.match(extensionCss, /stellar-sidebar-compact/);
  assert.match(extensionCss, /stellar-code-wrap/);
  assert.match(extensionCss, /stellar-reduce-motion/);
});
