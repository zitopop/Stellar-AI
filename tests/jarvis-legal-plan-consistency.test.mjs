import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (name) => readFileSync(new URL('../' + name, import.meta.url), 'utf8');

test('Terms and plan surfaces match paid Jarvis entitlements', () => {
  const terms = read('terms.html');
  const plans = read('plans.html');
  const landing = read('index.html');
  assert.match(terms, /Jarvis Voice \+ Vision/);
  assert.match(terms, /Jarvis Pro briefings and proactive alerts/);
  assert.match(terms, /Jarvis Computer module opens StellarX Work Agent/);
  assert.match(plans, /Jarvis Computer → StellarX computer control beta/);
  assert.match(landing, /Voice \+ Vision \+ Computer entry to StellarX beta/);
});

test('legal policies explain Jarvis camera and connected PC data', () => {
  const privacy = read('privacy.html');
  const acceptable = read('acceptable-use.html');
  assert.match(privacy, /Jarvis camera and voice features/);
  assert.match(privacy, /hand-tracking implementation runs in the browser/);
  assert.match(privacy, /Connected-tool and StellarX information/);
  assert.match(acceptable, /StellarX and connected computers/);
  assert.match(acceptable, /Jarvis Computer/);
  assert.match(acceptable, /Emergency Stop/);
});

test('plain-English guide and StellarX terms explain the product split', () => {
  const guide = read('what-is-what.html');
  const desktop = read('desktop-agent.html');
  assert.match(guide, /premium voice, vision and assistant workspace/);
  assert.match(guide, /Voice \+ Vision \+ Computer entry to StellarX computer control beta/);
  assert.match(guide, /using Jarvis, connecting a PC or plugin/);
  assert.match(desktop, /Using the Computer module from the paid Jarvis workspace requires/);
  assert.match(desktop, /Plus currently includes Jarvis Voice \+ Vision/);
});

test('cancellation text covers plan-linked Jarvis access', () => {
  const refunds = read('refunds.html');
  assert.match(refunds, /paid plan includes Jarvis features/);
  assert.match(refunds, /corresponding Jarvis entitlement/);
});
