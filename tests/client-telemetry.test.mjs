import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const endpoint = readFileSync(new URL('../api/get-plan.js', import.meta.url), 'utf8');
const helper = readFileSync(new URL('../lib/assets/telemetry.js', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const landing = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const install = readFileSync(new URL('../install.html', import.meta.url), 'utf8');

test('client telemetry accepts only fixed coarse event names', () => {
  for (const name of [
    'landing-view','app-view','app-open-cta','upgrade-intent','signup-success','login-success',
    'first-message-sent','chat-send-error','checkout-open','checkout-error','billing-open','client-error',
    'usage-panel-opened','plans-panel-opened','upgrade-from-usage','business-service-clicked','install-view','install-cta','install-completed'
  ]) {
    assert.ok(endpoint.includes("'" + name + "'"), name);
    assert.ok(helper.includes("'" + name + "'"), name);
  }
  assert.match(endpoint, /if \(!CLIENT_METRIC_EVENTS\.has\(event\)\) return res\.status\(400\)/);
});

test('telemetry stays analytics-only and never persists user content', () => {
  assert.match(endpoint, /incrementConversionMetric\('client-' \+ event\)/);
  assert.doesNotMatch(endpoint, /req\.body\?\.(?:prompt|email|message|error|stack|card|image)/);
  assert.match(helper, /JSON\.stringify\(\{ event: name, source: attributionSource\(\) \}\)/);
  assert.doesNotMatch(helper, /document\.body\.innerText|prompt\.value|textarea\.value/);
  assert.match(helper, /stellar_metrics_optout/);
  assert.match(helper, /stellar_acquisition_source/);
  assert.match(endpoint, /client-\$\{event\}-source-\$\{source\}/);
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


test('install funnel is visible and measurable across social sources', () => {
  assert.match(landing, /href="\/install"[^>]*data-conversion="install"/);
  assert.match(landing, /Install the app free/);
  assert.match(install, /telemetry\.js/);
  assert.match(install, /track\?\.\('install-cta'\)/);
  assert.match(install, /track\?\.\('install-completed'\)/);
  for (const source of ['tiktok','instagram','youtube','x']) {
    assert.ok(helper.includes("'" + source + "'"), source);
    assert.ok(endpoint.includes("'" + source + "'"), source);
  }
});
