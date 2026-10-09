import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createSession } from '../lib/auth.js';
import pluginManagerHandler from '../lib/plugin-manager-handler.js';
import { getPluginDefinition } from '../lib/plugin-registry.js';

const ownerEmail = 'plugin-test-owner@example.invalid';
process.env.AUTH_SESSION_SECRET = 'local-test-only-plugin-oauth-signing-key';
process.env.PRIVATE_ACCESS_EMAILS = ownerEmail;

function request(email, id) {
  const result = { code: 200, body: null, headers: {} };
  const req = {
    method: 'GET',
    headers: { authorization: 'Bearer ' + createSession(email), origin: 'https://trystellarai.com' },
    query: { action: 'providerStatus', id },
    body: {},
  };
  const res = {
    setHeader(name, value) { result.headers[name] = value; return this; },
    status(code) { result.code = code; return this; },
    json(body) { result.body = body; return this; },
    end() { return this; },
  };
  return pluginManagerHandler(req, res).then(() => result);
}

test('GitHub OAuth requires both server credentials and stays owner-only', async () => {
  assert.deepEqual(getPluginDefinition('github').setupEnv, ['GITHUB_OAUTH_CLIENT_ID', 'GITHUB_OAUTH_CLIENT_SECRET']);
  delete process.env.GITHUB_OAUTH_CLIENT_ID;
  delete process.env.GITHUB_OAUTH_CLIENT_SECRET;
  let response = await request(ownerEmail, 'github');
  assert.equal(response.code, 200);
  assert.equal(response.body.oauthAvailable, false);
  assert.deepEqual(response.body.oauthStatus.missing, ['GITHUB_OAUTH_CLIENT_ID', 'GITHUB_OAUTH_CLIENT_SECRET']);
  process.env.GITHUB_OAUTH_CLIENT_ID = 'test-github-id';
  response = await request(ownerEmail, 'github');
  assert.equal(response.body.oauthAvailable, false);
  process.env.GITHUB_OAUTH_CLIENT_SECRET = 'test-github-secret';
  response = await request(ownerEmail, 'github');
  assert.equal(response.body.oauthAvailable, true);
  assert.equal(response.body.oauthStatus.missing.length, 0);
  response = await request('regular-user@example.invalid', 'github');
  assert.equal(response.code, 403);
});

test('Gmail OAuth is unavailable without a client secret and supports a full Google pair', async () => {
  for (const key of ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET']) delete process.env[key];
  process.env.GMAIL_CLIENT_ID = 'test-gmail-id';
  let response = await request(ownerEmail, 'gmail');
  assert.equal(response.body.oauthAvailable, false);
  assert.deepEqual(response.body.oauthStatus.missing, ['GMAIL_CLIENT_SECRET']);
  process.env.GMAIL_CLIENT_SECRET = 'test-gmail-secret';
  response = await request(ownerEmail, 'gmail');
  assert.equal(response.body.oauthAvailable, true);
  delete process.env.GMAIL_CLIENT_ID;
  delete process.env.GMAIL_CLIENT_SECRET;
  process.env.GOOGLE_OAUTH_CLIENT_ID = 'test-google-id';
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'test-google-secret';
  response = await request(ownerEmail, 'gmail');
  assert.equal(response.body.oauthAvailable, true);
  assert.deepEqual(response.body.oauthStatus.setupEnv, ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET']);
  response = await request('regular-user@example.invalid', 'gmail');
  assert.equal(response.code, 200);
  assert.equal(response.body.oauthAvailable, true);
  assert.equal(response.body.oauthStatus.missing, undefined, 'Do not reveal setup details to nonowners');
  assert.equal(response.body.oauthStatus.setupEnv, undefined, 'Do not reveal environment key names to nonowners');
});

test('OAuth states are consumed atomically to prevent callback replay', async () => {
  const manager = await readFile(new URL('../lib/plugin-manager-handler.js', import.meta.url), 'utf8');
  assert.match(manager, /redis\('getdel','stellar:plugin:oauth:'\+state\)/);
  assert.doesNotMatch(manager, /redis\('get','stellar:plugin:oauth:'\+state\)/);
});
