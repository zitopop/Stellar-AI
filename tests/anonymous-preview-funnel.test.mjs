import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { detectTarget, normaliseClientId, normalisePrompt, stripCodeFences } from '../api/preview.js';

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const homepageRuntime = readFileSync(new URL('../lib/assets/homepage.js', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const builder = readFileSync(new URL('../business-builder.html', import.meta.url), 'utf8');
const previewApi = readFileSync(new URL('../api/preview.js', import.meta.url), 'utf8');

test('anonymous preview helpers constrain input and detect supported stacks', () => {
  assert.equal(normalisePrompt('  Build QBCore code  '), 'Build QBCore code');
  assert.equal(normaliseClientId('abc_DEF-1234567890'), 'abc_DEF-1234567890');
  assert.equal(normaliseClientId('short'), '');
  assert.equal(detectTarget('Roblox RemoteEvent reward').framework, 'Roblox Luau');
  assert.equal(detectTarget('ESX xPlayer job').framework, 'ESX');
  assert.equal(detectTarget('ox_lib callback').framework, 'ox_lib');
  assert.equal(detectTarget('QBCore inventory job').framework, 'QBCore');
  assert.equal(stripCodeFences('\\`\\`\\`lua\\nprint("ok")\\n\\`\\`\\`'), 'print("ok")');
});

test('homepage offers exactly one anonymous preview path before account gating', () => {
  assert.match(home, /id="anonymous-preview-form"/);
  assert.match(home, /id="anonymous-preview-prompt"/);
  assert.match(home, /id="anonymous-preview-result"/);
  assert.match(homepageRuntime, /fetch\('\/api\/preview'/);
  assert.match(homepageRuntime, /stellar-anonymous-preview-used-v1/);
  assert.match(homepageRuntime, /auth.*preview/);
  assert.match(homepageRuntime, /Create a free account to generate again/);
});

test('preview endpoint is server-only, capped and fails closed without usage storage', () => {
  assert.match(previewApi, /KV_REST_API_URL/);
  assert.match(previewApi, /\['SET', deviceKey, '1', 'NX', 'EX', PREVIEW_TTL_SECONDS\]/);
  assert.match(previewApi, /IP_PREVIEW_LIMIT = 5/);
  assert.match(previewApi, /Cache-Control', 'no-store/);
  assert.match(previewApi, /max_completion_tokens: 850/);
  assert.match(previewApi, /ANON_PREVIEW_USED/);
});

test('preview gate cannot be bypassed by closing the sign-in panel in the app', () => {
  assert.match(app, /previewAuthGateRequested/);
  assert.match(app, /if\(previewAuthGateRequested&&!signedInUser\)/);
  assert.match(app, /Create a free account to download the preview or generate another/);
});

test('downloadable code carries Stellar attribution while anonymous preview download stays gated', () => {
  const watermark = /Generated with Stellar AI.*https:\/\/trystellarai\.com/;
  assert.match(app, watermark);
  assert.match(home, watermark);
  assert.match(builder, watermark);
  assert.match(homepageRuntime, /anonymous-preview-download/);
  assert.match(homepageRuntime, /gateToAccount/);
});
