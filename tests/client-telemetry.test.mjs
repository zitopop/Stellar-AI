import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const endpoint = readFileSync(new URL('../api/track-event.js', import.meta.url), 'utf8');
const helper = readFileSync(new URL('../lib/assets/telemetry.js', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const landing = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('client telemetry accepts only fixed coarse event names', () => {
  for (const name of [
    'landing-view','app-view','app-open-cta','upgrade-intent','signup-success','login-success',
    'first-message-sent','chat-send-error','checkout-open','checkout-success','checkout-cancelled','checkout-error',
    'settings-opened','model-selected','billing-open','client-error'
  ]) {
    assert.ok(endpoint.includes("'" + name + "'"), name);
    assert.ok(helper.includes("'" + name + "'"), name);
  }
  assert.match(endpoint, /if \(!CLIENT_METRIC_EVENTS\.has\(event\)\) return res\.status\(400\)/);
});

test('telemetry endpoint does not persist arbitrary client payload fields', () => {
  assert.match(endpoint, /const event = String\(req\.body\?\.event \|\| ''\)/);
  assert.match(endpoint, /incrementConversionMetric\('client-' \+ event\)/);
  assert.doesNotMatch(endpoint, /req\.body\?\.(?:prompt|email|message|error|stack|card|image)/);
});

test('client helper sends only event name and never serialises page or user content', () => {
  assert.match(helper, /JSON\.stringify\(\{ event: name \}\)/);
  assert.doesNotMatch(helper, /document\.body\.innerText|localStorage|sessionStorage|prompt|email|stack/);
});

test('public landing and app both load the shared telemetry helper', () => {
  assert.match(landing, /<script src="\/lib\/assets\/telemetry\.js"><\/script>/);
  assert.match(app, /<script src="\/lib\/assets\/telemetry\.js"><\/script>/);
});

test('app tracks conversion milestones without sending user content', () => {
  assert.match(app, /metric\(firstSignIn\?'signup-success':'login-success'\)/);
  assert.match(app, /trackFirstMessageOnce\(\)/);
  assert.match(app, /metric\('checkout-open'\)/);
  assert.match(app, /metric\('checkout-error'\)/);
  assert.match(app, /metric\('chat-send-error'\)/);
  assert.doesNotMatch(app, /metric\([^)]*text/);
});


test('client metric limiter has a defined privacy-safe key and a practical global ceiling', () => {
  assert.match(endpoint, /const key = String\(event \|\| 'unknown'\)/);
  assert.match(endpoint, /const CLIENT_MAX_PER_WINDOW = 600/);
  assert.doesNotMatch(endpoint, /clientWindows\.get\(key\)[\s\S]{0,80}const key/);
});

test('app records payment return, settings and model funnel milestones', () => {
  for (const name of ['checkout-success','checkout-cancelled','settings-opened','model-selected']) {
    assert.ok(app.includes("metric('" + name + "')"), name);
  }
});
