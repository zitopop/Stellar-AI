import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const checkout = fs.readFileSync(new URL('../api/create-checkout.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const policy = fs.readFileSync(new URL('../archive/docs/MONETIZATION_APPROVAL.md', import.meta.url), 'utf8');

test('Stripe returns identify payment state and purchased plan', () => {
  assert.match(checkout, /payment=success/);
  assert.match(checkout, /payment=cancelled/);
  assert.match(checkout, /encodeURIComponent\(plan\)/);
});

test('credit top-up checkout remains one-time, bounded, and actionable on failure', () => {
  assert.match(checkout, /if \(plan === 'topup'\)/);
  assert.match(checkout, /mode: 'payment'/);
  assert.match(checkout, /unit_amount: pence/);
  assert.match(checkout, /if \(!isValidTopupPence\(rawPence\)\)/);
  assert.match(app, /if \(response\.ok && data\.url\)/);
  assert.match(app, /response\.status === 401/);
  assert.match(app, /Credit checkout could not start/);
  assert.match(app, /Could not reach credit checkout/);
});

test('checkout exposes specific monthly and annual configuration failures', () => {
  for (const label of ['Starter', 'Plus', 'Pro']) assert.match(checkout, new RegExp(`${label} (monthly|annual) checkout is not configured yet`));
  assert.match(checkout, /STRIPE_PRICE_MODE_MISMATCH/);
});

test('checkout client handles non-2xx and non-JSON responses without leaving buttons disabled', () => {
  assert.match(app, /const data = await response\.json\(\)\.catch\(\(\) => \(\{\}\)\);/);
  assert.match(app, /if \(response\.ok && data\.url\)/);
  assert.match(app, /showCheckoutError\(data\.error \|\| `Checkout could not start \(\$\{response\.status\}\)/);
  assert.match(app, /Could not reach checkout\. Please check your connection and try again\./);
});

test('top-up UI uses the backend contract limits and corrected pack totals', () => {
  assert.match(app, /id="topup-range" min="50" max="20000"/);
  assert.match(app, /£11\.00 credit/);
  assert.match(app, /£28\.75 credit/);
  assert.match(app, /£60\.00 credit/);
});

test('usage surfaces separate included allowance from spendable overage credit', () => {
  assert.match(app, /Included hourly allowance/);
  assert.match(app, /Overage credit/);
  assert.match(app, /Credit does not raise your hourly limit/);
  assert.match(app, /5p per request after included allowance/);
  assert.ok(app.includes('id="u-promo"'));
  assert.ok(app.includes('id="u-paid"'));
  assert.ok(app.includes("left + ' included left / ' + moneyShort(wallet) + ' overage credit'"));
  assert.ok(app.includes("left + ' included requests left, ' + moneyShort(wallet) + ' overage credit'"));
  assert.match(app, /wr\.style\.display = \(wallet > 0 \|\| Store\.get\(\)\.user \|\| isOwner\(\)\) \? '' : 'none'/);
});

test('repository policy requires review before monetization publication', () => {
  assert.match(policy, /prepare, review, approve, then publish/i);
  assert.match(policy, /must not push changes to `main`/i);
  assert.match(policy, /api\//);
  assert.match(policy, /webhook/i);
});
