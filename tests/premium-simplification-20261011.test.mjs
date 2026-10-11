import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const landing = read('index.html');
const app = read('app.html');
const landingCss = read('lib/assets/stellar-landing-premium-20261011.css');
const appCss = read('lib/assets/stellar-chat-home-premium-20261011.css');

test('Stellar landing explains everyday AI before specialist services', () => {
  assert.match(landing, /<h1 id="hero-title">Think bigger\. Get it done with Stellar\.<\/h1>/);
  assert.match(landing, /Start chatting free/);
  assert.match(landing, /No card required/);
  assert.match(landing, /15 free Fast messages each day/);
  const hero = landing.indexOf('id="hero-title"');
  const work = landing.indexOf('id="work-tasks"');
  const preview = landing.indexOf('id="try-preview"');
  const service = landing.indexOf('<section class="script-fix-promo"');
  assert.ok(hero >= 0 && work > hero && preview > work && service > preview);
  assert.equal((landing.match(/<h1\b/g) || []).length, 1);
  assert.match(landing, /stellar-landing-premium-20261011\.css\?v=1/);
  for (const id of ['example-showcase','work-tasks','jarvis','stellar-models','plans','faq','anonymous-preview-form'])
    assert.ok(landing.includes('id="' + id + '"'), 'missing ' + id);
});

test('chat keeps essential features but defaults to one focused conversation', () => {
  assert.match(app, /stellar-chat-home-premium-20261011\.css\?v=1/);
  for (const id of ['chatForm','prompt','modelBtn','sendBtn','newChatBtn','chatList','menuBtn'])
    assert.ok(app.includes('id="' + id + '"'), 'missing ' + id);
  assert.match(app, /data-composer-mode="general"/);
  assert.match(app, /data-composer-mode="debug"/);
  assert.match(app, /Ask anything, or describe what you need/);
  assert.match(appCss, /\.side-primary/);
  assert.match(appCss, /\.side-new-chat/);
  assert.match(appCss, /\.composer-layout/);
});

test('new styles keep mobile and accessibility protections', () => {
  for (const css of [landingCss, appCss]) {
    assert.match(css, /prefers-reduced-motion:reduce/);
    assert.match(css, /focus-visible/);
    assert.match(css, /@media\(max-width:/);
  }
  assert.match(appCss, /min-width:44px!important/);
  assert.match(landingCss, /\.public-home \.hero/);
});
