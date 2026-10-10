import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const landing = read('index.html');
const chat = read('app.html');
const jarvis = read('jarvis-workspace.html');
const css = read('lib/assets/stellar-premium-experience-20261010.css');
const focusedCss = read('lib/assets/stellar-landing-focused-v2.css');
const asset = '/lib/assets/stellar-premium-experience-20261010.css?v=1';

test('all customer surfaces keep the shared premium design', () => {
  for (const [name, markup] of [['landing', landing], ['chat', chat], ['Jarvis', jarvis]]) {
    assert.equal(markup.split(asset).length - 1, 1, name + ' shared stylesheet');
    assert.ok(markup.indexOf(asset) < markup.indexOf('</head>'), name + ' stylesheet in head');
  }
  assert.match(css, /\.public-home \.hero h1/);
  assert.match(css, /body\[data-stellar-clean-app="true"\] \.composer/);
  assert.match(css, /body\.jarvis-experience \.jarvis-orb/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(focusedCss, /\.public-home \.demo-tabs/);
  assert.match(focusedCss, /@media\(max-width:640px\)/);
});

test('public purchase and previews are still present', () => {
  assert.match(landing, /<h1 id="hero-title">Your ideas\. Real work\. One powerful AI\.<\/h1>/);
  for (const id of ['anonymous-preview-form','anonymous-preview-result','example-showcase','work-tasks','plans','faq']) {
    assert.ok(landing.includes('id="' + id + '"'), id);
  }
  for (const plan of ['free','starter','plus','pro']) {
    assert.ok(landing.includes('data-plan="' + plan + '"'), plan);
  }
  assert.match(landing, /No card required/);
  assert.match(landing, /Yearly plans are billed upfront/);
  assert.match(landing, /Illustrative examples · not a live chat/);
});

test('chat controls and Jarvis entitlement checks remain wired', () => {
  for (const id of ['chatForm','prompt','modelBtn','composer-model-menu','sendBtn','newChatBtn']) {
    assert.ok(chat.includes('id="' + id + '"'), 'chat ' + id);
  }
  assert.match(jarvis, /id="jarvis-live-indicator"/);
  assert.match(jarvis, /data-jarvis-state="checking"/);
  for (const state of ['listening','speaking','thinking','error','ready']) {
    assert.ok(jarvis.includes("'" + state + "'"), state);
  }
  assert.match(jarvis, /document\.body\.dataset\.jarvisState=state/);
  assert.match(jarvis, /syncJarvisAccess/);
  assert.match(jarvis, /jarvisEntitled/);
});
