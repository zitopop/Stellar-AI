import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const endpoint = readFileSync(new URL('../api/track-event.js', import.meta.url), 'utf8');
const tracker = readFileSync(new URL('../lib/assets/stellar-analytics.js', import.meta.url), 'utf8');
const pages = [
  'thank-you.html',
  'business-thank-you.html',
  'ai-receptionist-thank-you.html',
  'website-audit-thank-you.html',
];

test('analytics endpoint records only an allow-listed event counter', () => {
  assert.match(endpoint, /const ALLOWED_EVENTS = new Set/);
  assert.match(endpoint, /cleanEvent\(req\.body\?\.event\)/);
  assert.match(endpoint, /Unknown analytics event/);
  assert.match(endpoint, /incrementConversionMetric\(metric\)/);
  assert.doesNotMatch(endpoint, /req\.body\?\.email|req\.body\.email/);
  assert.doesNotMatch(endpoint, /req\.body\?\.phone|req\.body\.phone/);
  assert.doesNotMatch(endpoint, /req\.body\?\.prompt|req\.body\.prompt/);
  assert.doesNotMatch(endpoint, /req\.headers\[['"]x-forwarded-for['"]\]|req\.socket\.remoteAddress/);
});

test('client tracker uses keepalive or sendBeacon without collecting prompt text', () => {
  assert.match(tracker, /navigator\.sendBeacon/);
  assert.match(tracker, /fetch\('\/api\/track-event'/);
  assert.match(tracker, /window\.StellarTrack = track/);
  assert.doesNotMatch(tracker, /textarea\.value|input\.value|localStorage\.getItem\(['"]stellarChats|prompt\.value/i);
});

test('payment thank-you pages load the tracker and keep users on Stellar support paths', () => {
  for (const page of pages) {
    const html = readFileSync(new URL(`../${page}`, import.meta.url), 'utf8');
    assert.match(html, /\/lib\/assets\/stellar-analytics\.js\?v=1/);
    assert.match(html, /\/support\?topic=billing|mailto:deadlyfox10@gmail\.com/);
    assert.doesNotMatch(html, /href=["']https:\/\/stripe\.com/i);
  }
});
