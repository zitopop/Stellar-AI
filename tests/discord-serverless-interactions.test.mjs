import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const endpoint = readFileSync(new URL('../api/discord-interactions.js', import.meta.url), 'utf8');
const helper = readFileSync(new URL('../lib/discord-interactions.js', import.meta.url), 'utf8');
const oauth = readFileSync(new URL('../api/discord-oauth.js', import.meta.url), 'utf8');

test('Discord serverless endpoint verifies signatures before processing commands', () => {
  assert.match(endpoint, /bodyParser: false/);
  assert.match(endpoint, /x-signature-ed25519/);
  assert.match(endpoint, /x-signature-timestamp/);
  assert.match(endpoint, /verifyDiscordInteraction/);
  assert.match(helper, /createPublicKey/);
  assert.match(helper, /verifySignature/);
});

test('core Discord commands have a T10-independent serverless path', () => {
  for (const name of ['debug','sync','serverpass','support','stellar-status']) {
    assert.match(helper, new RegExp("name: '" + name + "'"));
  }
  assert.match(helper, /activate-server-pass/);
  assert.match(helper, /account-status/);
  assert.match(helper, /Serverless Discord interactions: \*\*online\*\*/);
});

test('Discord OAuth opportunistically self-heals command registration and endpoint configuration', () => {
  assert.match(oauth, /ensureDiscordInteractionsBootstrap/);
  assert.match(helper, /applications\.commands\.update/);
  assert.match(helper, /interactions_endpoint_url/);
  assert.match(helper, /stellar:discord-interactions-bootstrap-lock/);
});

test('cloud bot token is optional for core commands but enables Discord role and ticket management', () => {
  assert.match(endpoint, /botRoleManagementConfigured/);
  assert.match(helper, /DISCORD_BOT_TOKEN/);
  assert.match(helper, /syncRoles/);
  assert.match(helper, /createSupportTicket/);
});
