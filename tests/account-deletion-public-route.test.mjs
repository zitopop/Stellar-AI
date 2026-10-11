import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

test('public account deletion route and privacy disclosures stay wired', () => {
  const routes = JSON.parse(read('vercel.json')).rewrites;
  assert.ok(routes.some(({ source, destination }) => source === '/account-deletion' && destination === '/account-deletion.html'));
  assert.match(read('account-deletion.html'), /Request account deletion/);
  assert.match(read('legal.html'), /href="\/account-deletion"/);
  assert.match(read('privacy.html'), /href="\/account-deletion"/);
  assert.match(read('terms.html'), /href="\/account-deletion"/);
});

test('app offers an authenticated first-party deletion request, not just an email link', () => {
  const app = read('app.html');
  assert.ok(app.includes(String.raw`data-action=\"request-account-deletion\"`));
  assert.match(app, /fetch\('\/api\/account-deletion-request'/);
  assert.match(app, /headers:authHeaders\(\)/);
  assert.match(app, /confirm:'DELETE'/);
});

test('deletion requests require a valid session and do not claim immediate erasure', () => {
  const api = read('api/account-deletion-request.js');
  assert.match(api, /requireSession\(req, res\)/);
  assert.match(api, /req\.body\?\.confirm !== 'DELETE'/);
  assert.match(api, /status: 'pending'/);
  assert.match(api, /'SET', key, JSON\.stringify\(record\), 'NX'/);
  assert.doesNotMatch(api, /\.deleteUser\(|['"]DEL['"],\s*['"]stellar:user/);
});

test('native release remains gated by actual device testing and data deletion fulfillment', () => {
  const gate = read('mobile/STORE-READINESS.md');
  assert.match(gate, /Account deletion/);
  assert.match(gate, /Native utility/);
  assert.match(gate, /Android Assist Mode/);
  assert.match(gate, /Legal identity/);
});
