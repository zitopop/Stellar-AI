import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (name) => fs.readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const publicPolish = read('site-polish.css');
const orbit = read('stellar-orbit.css');
const growthCss = read('stellar-growth-v1.css');
const growthJs = read('stellar-growth-v1.js');
const app = read('app.html');

test('landing hero restores scoped 3D depth after the global flat presentation guard', () => {
  assert.match(publicPolish, /\.page-shell \.hero-visual\s*\{[\s\S]*?perspective:\s*1700px\s*!important/);
  assert.match(publicPolish, /\.page-shell \.hero-depth-orbit[\s\S]*?display:\s*block\s*!important/);
  assert.match(publicPolish, /\.page-shell \.hero-visual \.product-frame\s*\{[\s\S]*?rotateX\(var\(--tilt-x\)\)/);
  assert.match(publicPolish, /prefers-reduced-motion:\s*reduce[\s\S]*?\.page-shell \.hero-visual \.product-frame/);
});

test('reasoning control remains semantic while presenting a galaxy power rail', () => {
  assert.match(growthJs, /role="radiogroup" aria-label="Reasoning power"/);
  for (const key of ['fabie', 'smart', 'comet', 'ultra']) assert.match(growthJs, new RegExp(`data-growth-level="\\$\\{level\\.key\\}"`));
  assert.match(growthCss, /\.stellar-reasoning-track::before/);
  assert.match(growthCss, /linear-gradient\(90deg, #72ead0 0%, #9f89ff 34%, #76a7ff 67%, #f1cc77 100%\)/);
  assert.match(growthCss, /data-growth-level="ultra"/);
});

test('new-chat home keeps the four-action contract inside the premium Orbit shell', () => {
  assert.match(orbit, /body\.stellar-orbit-v3:not\(\.light\) \.greet-wrap/);
  assert.match(orbit, /body\.stellar-orbit-v3:not\(\.light\) #suggestion-chips/);
  assert.match(orbit, /body\.stellar-orbit-v3:not\(\.light\) \.sug-chip/);
  const quickStarts = [...app.matchAll(/class="sug-chip"/g)];
  assert.equal(quickStarts.length, 8); // four quick starts in each of the two existing render paths
});

test('final polish leaves voice, settings and plan infrastructure in place', () => {
  assert.match(app, /id="voice-call-modal"/);
  assert.match(app, /data-tab="voice"/);
  assert.match(app, /id="accent-theme-track"/);
  assert.match(app, /id="plans-grid-inner"/);
  assert.match(app, /id="model-menu"/);
});