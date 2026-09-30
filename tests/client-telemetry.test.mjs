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
    'first-message-sent','chat-send-error','checkout-open','checkout-error','billing-open','client-error',
    'usage-panel-opened','plans-panel-opened','upgrade-from-usage','business-service-clicked'
  ]) {
    assert.ok(endpoint.includes("'" + name + "'"), name);
    assert.ok(helper.includes("'" + name + "'"), name);
  }
  assert.match(endpoint, /if \(!CLIENT_METRIC_EVENTS\.has\(event\)\) return res\.status\(400\)/);
});

test('telemetry stays analytics-only and never persists user content', () => {
  assert.match(endpoint, /incrementConversionMetric\('client-' \+ event\)/);
  assert.doesNotMatch(endpoint, /req\.body\?\.(?:prompt|email|message|error|stack|card|image)/);
  assert.match(helper, /JSON\.stringify\(\{ event: name \}\)/);
  assert.doesNotMatch(helper, /document\.body\.innerText|prompt\.value|textarea\.value/);
  assert.match(helper, /stellar_metrics_optout/);
  assert.doesNotMatch(helper, /ensureCreditIcon|makePackLink|tidyLandingPage|openDrawer|closeDrawer|injectBusinessPolish/);
});

test('landing and app both load the shared metrics helper', () => {
  assert.match(landing, /<script src="\/lib\/assets\/telemetry\.js(?:\?[^"]+)?"><\/script>/);
  assert.match(app, /<script src="\/lib\/assets\/telemetry\.js(?:\?[^"]+)?"><\/script>/);
  assert.match(app, /data-stellar-clean-app="true"/);
});

test('app tracks conversion milestones without sending user content', () => {
  assert.match(app, /function metric\(name\)/);
  assert.match(app, /function trackFirstMessageOnce\(\)/);
  assert.match(app, /metric\('checkout-open'\)/);
  assert.match(app, /metric\('checkout-error'\)/);
  assert.match(app, /metric\('chat-send-error'\)/);
  assert.match(app, /metric\('billing-open'\)/);
  assert.match(app, /metric\('usage-panel-opened'\)/);
  assert.match(app, /metric\('upgrade-from-usage'\)/);
  assert.doesNotMatch(app, /metric\([^)]*(?:userText|prompt\.value|messages)/);
});
