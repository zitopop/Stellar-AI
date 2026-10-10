import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const home = read('index.html');
const plans = read('plans.html');
const app = read('app.html');
const jarvis = read('jarvis-workspace.html');
const styles = read('lib/assets/stellar-unified-brand-v1.css');

test('all primary Stellar surfaces use the same branded stylesheet', () => {
  for (const page of [home, plans, app, jarvis]) {
    assert.match(page, /stellar-unified-brand-v1\.css/);
  }
  assert.match(styles, /\.public-home \.stellar-j-shell/);
  assert.match(styles, /\.jarvis-experience \.jarvis-orb/);
});

test('landing describes Jarvis access honestly and preserves model tiers', () => {
  assert.match(home, /<h1 id="hero-title">Your ideas\. Real work\. One powerful AI\.<\/h1>/);
  for (const model of ['Stellar Fast','Stellar Core','Stellar Deep','Stellar Max']) {
    assert.match(home, new RegExp(model));
  }
  assert.match(home, /Connected services need your authorisation/);
  assert.match(home, /Illustration, not a recording of an autonomous action/);
  assert.match(home, /href="\/jarvis"/);
  assert.match(home, /href="\/plugins"/);
});

test('Jarvis can select a browser speech recognition language without bypassing plan checks', () => {
  assert.match(jarvis, /Jarvis <span class="jarvis-brand-subtitle">BY STELLAR AI/);
  assert.match(jarvis, /id="jarvis-speech-language"/);
  assert.match(jarvis, /stellarJarvisSpeechLang/);
  assert.match(jarvis, /recognition\.lang=/);
  assert.match(jarvis, /jarvisEntitled/);
  assert.match(jarvis, /\/api\/get-plan/);
  assert.match(jarvis, /Languages depend on your browser and device/);
});

test('billing and app controls remain intact', () => {
  for (const value of ['£8','£20','£75']) assert.ok(plans.includes(value));
  assert.match(plans, /Up to 7,500 Fast generations\/month/);
  assert.match(plans, /data-billing-cycle="annual"/);
  assert.match(app, /id="chatForm"/);
  assert.match(app, /id="newChatBtn"/);
  assert.match(app, /data-open="settings"/);
});
