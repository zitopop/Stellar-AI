import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BUSINESS_SERVICES,
  businessServiceFromCheckout,
  checkoutCustomFields,
  invoiceHasAiReceptionist,
  subscriptionHasAiReceptionist,
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
