import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const jarvis = readFileSync(new URL('../jarvis.html', import.meta.url), 'utf8');
const studio = readFileSync(new URL('../roblox-studio.html', import.meta.url), 'utf8');
const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));

test('public restricted features do not expose owner-only labels', () => {
  for (const page of [jarvis, studio]) {
    assert.doesNotMatch(page, /owner-only|Owner only|Owner verified|Checking owner/i);
  }
  assert.match(jarvis, /data-restricted="true"/);
  assert.match(jarvis, /restricted-verified/);
  assert.match(studio, /Checking access/);
  assert.match(studio, /Access restricted/);
  assert.match(studio, /Access verified/);
});

test('revenue service rewrites target working extensionless service routes', () => {
  const rewrites = new Map((vercel.rewrites || []).map(rule => [rule.source, rule.destination]));
  assert.equal(rewrites.get('/business'), '/services/business');
  assert.equal(rewrites.get('/ai-receptionist'), '/services/ai-receptionist');
  assert.equal(rewrites.get('/website-audit'), '/services/website-audit');
});
