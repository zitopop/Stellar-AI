import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const plans = readFileSync(new URL('../plans.html', import.meta.url), 'utf8');

test('landing focuses on everyday tasks while detailed paid examples stay on the plans page', () => {
  assert.match(home, /id="work-tasks"/);
  assert.match(home, /id="plans"/);
  assert.match(home, /class="work-shortcuts"/);
  assert.doesNotMatch(home, /class="section plan-workflows"/);
  assert.match(plans, /Try the kind of work you would pay for|See what each paid plan is for/);
  for (const tier of ['starter', 'plus', 'pro']) {
    assert.match(plans, new RegExp('utm_campaign=try-' + tier + '-workflow'));
    assert.match(plans, new RegExp('data-conversion="plan-workflow-' + tier + '"'));
  }
  assert.match(plans, /can be tried (on|with) Free/);
  assert.match(plans, /not guarantee|not guaranteed/);
});

test('pricing amounts, real model allowances and existing checkout paths are preserved', () => {
  for (const [tier, price, count] of [
    ['starter', 8, '2,500'],
    ['plus', 20, '7,500'],
    ['pro', 75, '15,000'],
  ]) {
    assert.match(home, new RegExp('Up to ' + count + ' Fast-equivalent generations/month'));
    assert.match(plans, new RegExp('Up to ' + count + ' Fast generations/month'));
    assert.ok(plans.includes('href="/app?upgrade=' + tier + '"'));
    assert.ok(plans.includes('href="/app?upgrade=' + tier + '-annual"'));
    assert.ok(plans.includes('£' + price));
  }
  assert.match(plans, /Jarvis and StellarX need supported devices, availability and your approved setup/);
});
