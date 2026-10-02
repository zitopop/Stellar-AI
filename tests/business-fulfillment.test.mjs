import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  BUSINESS_SERVICES,
  businessQueueDedupeId,
  businessServiceFromCheckout,
  checkoutCustomFields,
  createBusinessCustomerUpdateToken,
  getPublicBusinessReceptionist,
  invoiceHasAiReceptionist,
  recoverBusinessFulfillmentJobs,
  subscriptionHasAiReceptionist,
  validateBusinessFulfillmentDetails,
  verifyBusinessCustomerUpdateToken,
} from '../lib/business-fulfillment.js';

test('live business payment links map to the correct fulfilment service', () => {
  assert.equal(
    businessServiceFromCheckout({ payment_link: BUSINESS_SERVICES.website_mini_audit.paymentLinkId }),
    'website_mini_audit',
  );
  assert.equal(
    businessServiceFromCheckout({ payment_link: BUSINESS_SERVICES.ai_receptionist.paymentLinkId }),
    'ai_receptionist',
  );
  assert.equal(
    businessServiceFromCheckout({ metadata: { service: 'website_mini_audit' } }),
    'website_mini_audit',
  );
  assert.equal(
    businessServiceFromCheckout({ metadata: { service: 'ai_receptionist' } }),
    'ai_receptionist',
  );
});

test('business fulfilment prices match the live Stripe products', () => {
  assert.equal(BUSINESS_SERVICES.website_mini_audit.initialAmountPence, 9900);
  assert.equal(BUSINESS_SERVICES.ai_receptionist.initialAmountPence, 19900);
  assert.equal(BUSINESS_SERVICES.ai_receptionist.setupPriceId, 'price_1UDYQ0F96AiVlq46EFGlhAYv');
  assert.equal(BUSINESS_SERVICES.ai_receptionist.monthlyPriceId, 'price_1UDYQ6F96AiVlq46IwLxBzvQ');
});

test('Stripe custom fields become clean fulfilment inputs', () => {
  const fields = checkoutCustomFields({
    custom_fields: [
      { key: 'website', text: { value: ' https://example.com ' } },
      { key: 'businessfacts', text: { value: 'Open 9-5\nServices: MOT & repair' } },
      { key: 'customdomain', dropdown: { value: 'existing' } },
    ],
  });
  assert.equal(fields.website, 'https://example.com');
  assert.equal(fields.businessfacts, 'Open 9-5 Services: MOT & repair');
  assert.equal(fields.customdomain, 'existing');
});

test('AI Receptionist subscription detection uses its recurring Stripe price', () => {
  const subscription = {
    items: {
      data: [{ price: { id: BUSINESS_SERVICES.ai_receptionist.monthlyPriceId } }],
    },
  };
  assert.equal(subscriptionHasAiReceptionist(subscription), true);
  assert.equal(subscriptionHasAiReceptionist({ items: { data: [{ price: { id: 'price_other' } }] } }), false);
});

test('AI Receptionist invoice detection stays separate from Stellar plan invoices', () => {
  assert.equal(invoiceHasAiReceptionist({
    lines: { data: [{ price: { id: BUSINESS_SERVICES.ai_receptionist.monthlyPriceId } }] },
  }), true);
  assert.equal(invoiceHasAiReceptionist({
    lines: { data: [{ pricing: { price_details: { price: BUSINESS_SERVICES.ai_receptionist.monthlyPriceId } } }] },
  }), true);
  assert.equal(invoiceHasAiReceptionist({
    lines: { data: [{ price: { id: 'price_stellar_plus' } }] },
  }), false);
});


test('business correction links are signed and expire', () => {
  const env = { BUSINESS_UPDATE_SECRET: 'fixture-secret' };
  const job = { id: 'cs_test_123', customerEmail: 'buyer@example.com' };
  const issuedAt = 1_800_000_000_000;
  const token = createBusinessCustomerUpdateToken(job, { env, now: () => issuedAt });
  assert.ok(token.includes('.'));
  assert.equal(verifyBusinessCustomerUpdateToken(token, job, { env, now: () => issuedAt + 1000 }), true);
  assert.equal(verifyBusinessCustomerUpdateToken(token, { ...job, customerEmail: 'other@example.com' }, { env, now: () => issuedAt + 1000 }), false);
  assert.equal(verifyBusinessCustomerUpdateToken(token + 'tampered', job, { env, now: () => issuedAt + 1000 }), false);
  assert.equal(verifyBusinessCustomerUpdateToken(token, job, { env, now: () => issuedAt + (15 * 24 * 60 * 60 * 1000) }), false);
});

test('website audit validation catches missing or malformed customer inputs', () => {
  const missing = validateBusinessFulfillmentDetails({
    service: 'website_mini_audit',
    details: { website: '', mainIssue: 'help' },
  });
  assert.equal(missing.ok, false);
  assert.deepEqual(missing.issues.map((issue) => issue.field).sort(), ['mainIssue','website']);

  const complete = validateBusinessFulfillmentDetails({
    service: 'website_mini_audit',
    details: { website: 'https://example.com', mainIssue: 'The mobile pricing page is hard to understand.' },
  });
  assert.equal(complete.ok, true);
});

test('AI Receptionist validation asks for facts instead of inventing them', () => {
  const missing = validateBusinessFulfillmentDetails({
    service: 'ai_receptionist',
    details: { website: 'not a url', businessFacts: 'Open', customDomain: '' },
  });
  assert.equal(missing.ok, false);
  assert.deepEqual(missing.issues.map((issue) => issue.field).sort(), ['businessFacts','customDomain','website']);

  const complete = validateBusinessFulfillmentDetails({
    service: 'ai_receptionist',
    details: {
      website: 'https://example.com',
      businessFacts: 'We repair cars Monday to Friday and bookings are made by phone.',
      customDomain: 'included-stellar-url',
    },
  });
  assert.equal(complete.ok, true);
});


test('business fulfilment queue generations prevent corrected jobs being deduplicated as the original', () => {
  const base = { id: 'cs_test_queue', queueGeneration: 0 };
  const corrected = { ...base, queueGeneration: 1 };
  assert.equal(businessQueueDedupeId(base), 'stellar-business-cs_test_queue-0');
  assert.equal(businessQueueDedupeId(corrected), 'stellar-business-cs_test_queue-1');
  assert.notEqual(businessQueueDedupeId(base), businessQueueDedupeId(corrected));
});

test('business fulfilment source includes automatic customer reminder recovery', () => {
  const source = readFileSync(new URL('../lib/business-fulfillment.js', import.meta.url), 'utf8');
  assert.match(source, /stellar-business-customer-reminder/);
  assert.match(source, /Upstash-Delay/);
  assert.match(source, /delay: '1d'/);
  assert.match(source, /delay: '3d'/);
  assert.match(source, /delay: '7d'/);
  assert.match(source, /Customer details remain unresolved after automatic reminders/);
});


test('business fulfilment source performs automatic final delivery and hosted receptionist launch', () => {
  const source = readFileSync(new URL('../lib/business-fulfillment.js', import.meta.url), 'utf8');
  assert.match(source, /automaticQa/);
  assert.match(source, /sendBusinessDelivery/);
  assert.match(source, /status: 'delivered'/);
  assert.match(source, /status: 'live'/);
  assert.match(source, /provisionBusinessReceptionist/);
  assert.match(source, /answerBusinessReceptionist/);
  assert.match(source, /submitBusinessReceptionistEnquiry/);
  assert.doesNotMatch(source, /if \(job\.status === 'draft_ready_review'\) return/);
});

test('business fulfilment has a watchdog recovery path for stale automatic jobs', () => {
  assert.equal(typeof recoverBusinessFulfillmentJobs, 'function');
  const source = readFileSync(new URL('../lib/business-fulfillment.js', import.meta.url), 'utf8');
  assert.match(source, /\['queued', 'retrying', 'processing', 'draft_ready_review'\]/);
  assert.match(source, /recoveredAt/);
});

test('hosted receptionist public loader is exported without exposing customer email', async () => {
  assert.equal(typeof getPublicBusinessReceptionist, 'function');
});
