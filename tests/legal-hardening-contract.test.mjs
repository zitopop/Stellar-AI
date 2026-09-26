import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const index = read('index.html');
const affiliate = read('affiliate.html');
const auth = read('api/auth.js');
const checkout = read('api/create-checkout.js');
const privacy = read('privacy.html');
const terms = read('terms.html');
const cookies = read('cookies.html');
const telemetry = read('lib/assets/telemetry.js');
const analytics = read('lib/assets/stellar-analytics.js');

test('public credit wording uses Stellar Credits rather than pound-value credit language', () => {
  assert.match(index, /100 welcome Stellar Credits/);
  assert.match(affiliate, /100 bonus Stellar Credits/);
  assert.match(auth, /100 free Stellar Credits are ready/);
  for (const source of [index, affiliate, auth, checkout]) {
    assert.doesNotMatch(source, /£1 (?:starting|bonus|free|referral) credit/i);
    assert.doesNotMatch(source, /Stellar AI Credit — £/);
  }
});

test('Stripe top-up line item states exact Stellar Credits and bonus units', () => {
  assert.match(checkout, /ADDON_CREDITS_PER_PENCE/);
  assert.match(checkout, /const totalCredits = baseCredits \+ bonusCredits/);
  assert.match(checkout, /Stellar AI Credits — \$\{totalCredits\.toLocaleString\('en-GB'\)\} credits/);
  assert.match(checkout, /bonus Stellar Credits\. Used after included plan credits/);
});

test('first-party metrics have an easy browser opt-out', () => {
  for (const source of [telemetry, analytics]) {
    assert.match(source, /stellar_metrics_optout/);
    assert.match(source, /if \(!metricsAllowed\(\)\) return false/);
  }
  assert.match(cookies, /Turn off product metrics/);
  assert.match(cookies, /Allow product metrics/);
  assert.match(cookies, /Product metrics are off on this browser/);
});

test('privacy notice states lawful bases, transfers, retention criteria and automated-decision position', () => {
  assert.match(privacy, /Why we use information and our lawful bases/);
  assert.match(privacy, /<strong>Contract:<\/strong>/);
  assert.match(privacy, /<strong>Legitimate interests:<\/strong>/);
  assert.match(privacy, /<strong>Legal obligation:<\/strong>/);
  assert.match(privacy, /<strong>Consent:<\/strong>/);
  assert.match(privacy, /outside the UK/);
  assert.match(privacy, /purpose-based retention/);
  assert.match(privacy, /Where information comes from and what is required/);
  assert.match(privacy, /Automated decisions/);
  assert.match(privacy, /right to object/i);
});

test('consumer terms avoid blanket liability cap, broad indemnity and blank-cheque variation wording', () => {
  assert.match(terms, /Responsibility when something goes wrong/);
  assert.match(terms, /death or personal injury caused by negligence/);
  assert.match(terms, /your right to a lawful remedy is not capped by a blanket contractual limit/);
  assert.match(terms, /will not use this clause to make a consumer pay for our own breach/);
  assert.match(terms, /will not use this clause as a blank cheque/);
  assert.doesNotMatch(terms, /total liability is limited to the amount you have paid us in the 12 months/i);
  assert.doesNotMatch(terms, /You agree to cover us for any loss, claim, or cost/i);
});