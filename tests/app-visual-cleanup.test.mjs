import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const callCss = readFileSync(new URL('../lib/assets/stellar-call.css', import.meta.url), 'utf8');
const smoothCss = readFileSync(new URL('../lib/assets/stellar-smooth-smart.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('legacy top model picker stylesheet does not collapse labels to a dot', () => {
  assert.match(callCss, /Compact top bar/);
  assert.match(callCss, /#current-model-label\{[\s\S]*?position:static!important/);
  assert.match(callCss, /max-width:min\(42vw,300px\)!important/);
});

test('legacy visual helper has no giant decorative planet', () => {
  assert.match(smoothCss, /\.app \.main::after\{content:none!important;display:none!important;\}/);
});

test('clean chat shell never invokes the browser prompt dialog', () => {
  assert.doesNotMatch(app, /\bwindow\.prompt\s*\(/);
  assert.doesNotMatch(app, /(^|[^.\w])prompt\s*\(/m);
});
