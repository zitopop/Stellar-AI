import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const homepage = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const plans = readFileSync(new URL('../plans.html', import.meta.url), 'utf8');
const serverPass = readFileSync(new URL('../server-pass.html', import.meta.url), 'utf8');
const llms = readFileSync(new URL('../llms.txt', import.meta.url), 'utf8');
const resource = readFileSync(new URL('../resources/qbcore-secure-webhook-logger/server.lua', import.meta.url), 'utf8');
const resourceConfig = readFileSync(new URL('../resources/qbcore-secure-webhook-logger/config.lua', import.meta.url), 'utf8');
const sitemap = readFileSync(new URL('../sitemap.xml', import.meta.url), 'utf8');

test('Server Pass is discoverable and described as a bounded pilot', () => {
  assert.match(homepage, /href="\/server-pass"/);
  assert.match(plans, /Server Pass pilot/);
  assert.match(serverPass, /£50\/month/);
  assert.match(serverPass, /two repairs per day|2 repairs per day/);
  assert.match(serverPass, /abuse controls/i);
  assert.doesNotMatch(serverPass, /zero rate limits|unlimited usage/i);
  assert.match(sitemap, /https:\/\/trystellarai\.com\/server-pass/);
});

test('developer trust copy avoids unsupported privacy and validation claims', () => {
  for (const source of [homepage, plans, serverPass, llms]) {
    assert.doesNotMatch(source, /zero code[- ]storage|never retain(?:s|ed)? code|never sent to model providers/i);
  }
  assert.match(homepage, /Anti-exploit validation is injected by default/);
  assert.match(llms, /Do not claim zero code retention/);
});

test('free QBCore logger keeps the webhook server-side and exposes no client event', () => {
  assert.match(resourceConfig, /GetConvar\('stellar_webhook_url'/);
  assert.match(resource, /exports\('SendStellarWebhook'/);
  assert.match(resource, /allowed_mentions/);
  assert.match(resource, /rateLimited/);
  assert.doesNotMatch(resource, /RegisterNetEvent|YOUR_DISCORD_WEBHOOK_URL_HERE/);
});
