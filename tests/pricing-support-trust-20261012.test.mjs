import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('pricing URL redirects to the canonical four-plan page', () => {
  const config = JSON.parse(read('vercel.json'));
  const redirect = config.redirects.find(item => item.source === '/pricing');
  assert.deepEqual(redirect, { source: '/pricing', destination: '/plans', permanent: true });
  const plans = read('plans.html');
  for (const name of ['Free', 'Starter', 'Plus', 'Pro']) {
    assert.ok(plans.includes('<h2>' + name + '</h2>'), name + ' pricing card missing');
  }
});

test('support looks like Stellar and retains working contact actions', () => {
  const support = read('support.html');
  assert.match(support, /Stellar AI support<\/span>/);
  assert.doesNotMatch(support, /DeadlyFox support|DeadlyFox ·/);
  assert.match(support, /href="mailto:deadlyfox10@gmail\.com"/);
  assert.match(support, /background:#090b12/);
  assert.doesNotMatch(support, /background:radial-gradient/);
  assert.match(support, />Usage help<\/button>/);
  assert.match(support, /<h3>Usage and allowance<\/h3>/);
  assert.match(support, /min-height:44px/);
  for (const action of ['copyEmail(', 'openSupportEmail(', 'sendWrittenRequest(']) assert.ok(support.includes(action), action);
});
