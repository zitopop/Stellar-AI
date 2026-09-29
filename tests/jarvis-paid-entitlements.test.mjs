import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getPlanDefinition } from '../lib/pricing.js';

const getPlan = readFileSync(new URL('../api/get-plan.js', import.meta.url), 'utf8');
const jarvis = readFileSync(new URL('../jarvis.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const plans = readFileSync(new URL('../plans.html', import.meta.url), 'utf8');
const landing = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('Jarvis paid tiers belong to server-owned plan definitions', () => {
  assert.equal(getPlanDefinition('free').jarvisTier, 'none');
  assert.equal(getPlanDefinition('starter').jarvisTier, 'none');
  assert.equal(getPlanDefinition('plus').jarvisTier, 'voice-vision');
  assert.equal(getPlanDefinition('pro').jarvisTier, 'pro');
  assert.equal(getPlanDefinition('owner').jarvisTier, 'owner');
});

test('get-plan exposes server-side Jarvis capabilities', () => {
  assert.match(getPlan, /jarvisTier:/);
  assert.match(getPlan, /voice: \['voice-vision','pro','owner'\]/);
  assert.match(getPlan, /vision: \['voice-vision','pro','owner'\]/);
  assert.match(getPlan, /briefings: \['pro','owner'\]/);
  assert.match(getPlan, /proactiveAlerts: \['pro','owner'\]/);
  assert.match(getPlan, /ownerControls: String\(definition\.jarvisTier/);
});

test('Jarvis workspace refuses accounts without a paid Jarvis entitlement', () => {
  assert.match(jarvis, /Jarvis is a paid Stellar feature/);
  assert.match(jarvis, /capabilities\?\.jarvis/);
  assert.match(jarvis, /if\(!jarvisAccess\.enabled\)/);
  assert.match(jarvis, /Upgrade to Plus for Voice \+ Vision/);
  assert.match(jarvis, /data-owner-only="true"/);
});

test('app and pricing surfaces explain Plus and Pro Jarvis value', () => {
  assert.match(app, /Plus unlocks Voice \+ Vision\. Pro adds briefings and alerts/);
  assert.match(app, /Jarvis Voice \+ Vision/);
  assert.match(app, /Jarvis Pro briefings \+ alerts/);
  assert.match(plans, /Jarvis Voice \+ Vision/);
  assert.match(plans, /Jarvis Pro briefings \+ proactive alerts/);
  assert.match(landing, /<td>Jarvis<\/td>/);
  assert.match(landing, /Pro briefings \+ proactive alerts/);
});

test('owner phone and admin controls stay owner-only', () => {
  assert.match(app, /const ownerTools=isOwner\(\)\?/);
  assert.match(app, /id="owner-call-now"/);
  assert.match(app, /id="jarvis-briefings-nav"/);
  assert.match(jarvis, /data-owner-only="true"/);
});
