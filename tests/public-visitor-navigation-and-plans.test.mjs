import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('public homepage menu opens and closes via real markup selectors', () => {
  const html = read('index.html');
  const js = read('lib/assets/homepage.js');
  const css = read('lib/assets/stellar-landing-clean-v1.css');

  assert.match(html, /class="menu-toggle"/);
  assert.match(html, /id="site-nav"/);
  assert.match(css, /\.site-nav\.is-open\{display:flex\}/);

  const listeners = new Map();
  const buttonListeners = new Map();
  const linkListeners = new Map();
  const resizeListeners = new Map();
  const classes = new Set(['site-nav']);
  const attrs = {};
  let focused = false;
  let desktop = false;
  const toggle = {
    dataset: {},
    setAttribute: (key, value) => { attrs[key] = value; },
    addEventListener: (name, callback) => { buttonListeners.set(name, callback); },
    contains: (target) => target === toggle,
    focus: () => { focused = true; },
  };
  const link = { addEventListener: (name, callback) => { linkListeners.set(name, callback); } };
  const menu = {
    classList: {
      contains: (name) => classes.has(name),
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      toggle: (name, active) => active ? classes.add(name) : classes.delete(name),
    },
    contains: (target) => target === menu || target === link,
    querySelectorAll: (selector) => selector === 'a' ? [link] : [],
  };
  const document = {
    readyState: 'complete',
    body: { classList: { contains: (name) => name === 'public-home' }, dataset: { layout: 'lean-v1' } },
    documentElement: { dataset: {} },
    querySelector: (selector) => selector === '.menu-toggle' ? toggle : selector === '#site-nav' ? menu : null,
    querySelectorAll: () => [],
    addEventListener: (name, callback) => { listeners.set(name, callback); },
  };
  const window = {
    addEventListener: (name, callback) => { resizeListeners.set(name, callback); },
    matchMedia: () => ({ matches: desktop }),
  };
  runInNewContext(js, { document, window, URLSearchParams });
  const open = () => buttonListeners.get('click')();
  open();
  assert.equal(classes.has('is-open'), true, 'mobile menu becomes visible');
  assert.equal(attrs['aria-expanded'], 'true');
  assert.equal(attrs['aria-label'], 'Close navigation menu');

  linkListeners.get('click')();
  assert.equal(classes.has('is-open'), false, 'navigation closes after link selection');
  open();
  listeners.get('click')({ target: {} });
  assert.equal(classes.has('is-open'), false, 'outside click closes mobile menu');
  open();
  listeners.get('keydown')({ key: 'Escape' });
  assert.equal(classes.has('is-open'), false, 'Escape closes menu');
  assert.equal(focused, true, 'focus returns to trigger after Escape');
  open();
  desktop = true;
  resizeListeners.get('resize')();
  assert.equal(classes.has('is-open'), false, 'resizing to desktop resets menu');
});

test('public plan details explain general AI work and match Pro model access', () => {
  const plans = read('plans.html');
  assert.match(plans, /Start free with AI chat, writing, planning and coding/);
  assert.doesNotMatch(plans, /Stellar focuses on FiveM Lua and Roblox Luau/);
  const pro = plans.split('<article class="plan paid" data-plan="pro"')[1].split('</article>')[0];
  for (const model of ['Stellar Fast', 'Stellar Core', 'Stellar Deep', 'Stellar Max']) {
    assert.ok(pro.includes(model), 'Pro should show ' + model);
  }
  assert.match(plans, /class="mobile-help" href="\/support"/);
  assert.match(plans, /Optional team and business services/);
  assert.match(plans, /href="\/refunds"/);
});
