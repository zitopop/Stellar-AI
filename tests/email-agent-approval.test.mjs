import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getPluginDefinition } from '../lib/plugin-registry.js';

const email = await readFile(new URL('../email-agent.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../app.html', import.meta.url), 'utf8');
const plugins = await readFile(new URL('../plugins.html', import.meta.url), 'utf8');
const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));

test('Draft Email Helper is approval-only and blocks bulk-style sending', () => {
  assert.match(email, /Draft Email Helper/);
  assert.match(email, /Write the email\.<br>You choose Send\./);
  assert.match(email, /Draft only · you approve send/);
  assert.match(email, /What is this tab\?/);
  assert.match(email, /Signed in:/);
  assert.match(email, /refreshAccountPill/);
  assert.match(email, /fetch\('\/api\/auth'/);
  assert.match(email, /openReviewedEmail/);
  assert.match(email, /oneRecipient/);
  assert.match(email, /Bulk\/multiple recipients are blocked here/);
  assert.match(email, /mail\.google\.com\/mail\/\?view=cm/);
  assert.match(email, /mailto:/);
  assert.ok(!email.includes('/api/send-email'));
  assert.ok(!email.includes('/api/gmail/send'));
  assert.ok(!email.includes('/api/broadcast'));
});

test('Email draft helper is discoverable from app settings and routing', () => {
  assert.match(app, /id="email-agent-nav"/);
  assert.match(app, /Draft, review and send only after approval/);
  assert.ok(vercel.rewrites.some(route => route.source === '/email-agent' && route.destination === '/email-agent.html'));
  assert.ok(vercel.headers.some(route => route.source === '/email-agent' && route.headers?.some(h => h.key === 'Cache-Control' && h.value === 'private, no-store')));
});

test('Gmail connector is user-facing while email sending remains a separate approval-only helper', () => {
  assert.equal(getPluginDefinition('gmail').audience, 'signed_in');
  assert.match(plugins, /Connected apps for Stellar\./);
  assert.match(plugins, /Human review/);
  assert.match(email, /Draft only · you approve send/);
  assert.ok(!email.includes('/api/gmail/send'));
});
