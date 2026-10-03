import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const helper=readFileSync(new URL('../lib/owner-escalation.js',import.meta.url),'utf8');
const webhook=readFileSync(new URL('../api/webhook.js',import.meta.url),'utf8');
const chat=readFileSync(new URL('../api/chat.js',import.meta.url),'utf8');

test('server escalation uses the protected Stellar endpoint',()=>{
  assert.match(helper,/OWNER_INTERNAL_TOKEN/);
  assert.match(helper,/action: 'escalateOwner'/);
  assert.match(helper,/x-owner-internal-token/);
  assert.match(helper,/threshold = 3/);
  assert.match(helper,/windowSeconds = 300/);
});

test('verified Stripe processing failures can escalate payment incidents',()=>{
  assert.match(webhook,/import \{ escalateOwner \}/);
  assert.match(webhook,/if \(event\?\.id\)/);
  assert.match(webhook,/category: 'payment'/);
  assert.match(webhook,/severity: 'critical'/);
});

test('repeated AI service failures feed the owner escalation system',()=>{
  assert.match(chat,/recordRepeatedServiceFailure/);
  assert.match(chat,/usage-enforcement/);
  assert.match(chat,/ai-upstream-/);
});
test('high-signal Stripe incidents escalate while recoverable invoice failures stay on provider dunning',()=>{
  assert.match(webhook,/invoice\.payment_failed/);
  assert.match(webhook,/const finalRevoke = Boolean\(invoiceSubscriptionStatus && subscriptionShouldRevoke\(invoiceSubscriptionStatus\)\)/);
  assert.match(webhook,/if \(finalRevoke\)/);
  assert.match(webhook,/leaving normal provider retry\/dunning to continue automatically/);
  assert.match(webhook,/payout\.failed/);
  assert.match(webhook,/charge\.dispute\.created/);
  assert.match(webhook,/radar\.early_fraud_warning\.created/);
  assert.match(webhook,/category: 'fraud'/);
});

test('urgent owner escalation falls back to configured owner email when phone calling fails',()=>{
  const broadcast=readFileSync(new URL('../api/broadcast.js',import.meta.url),'utf8');
  assert.match(broadcast,/sendOwnerFallbackEmail/);
  assert.match(broadcast,/OWNER_EMAILS/);
  assert.match(broadcast,/RESEND_API_KEY/);
  assert.match(broadcast,/fallback: 'email'/);
  assert.match(broadcast,/phone-unavailable/);
});

test('QStash urgent reminders reuse existing broadcast and webhook functions',()=>{
  const broadcast=readFileSync(new URL('../api/broadcast.js',import.meta.url),'utf8');
  assert.match(broadcast,/scheduleUrgentReminder/);
  assert.match(broadcast,/cancelUrgentReminder/);
  assert.match(broadcast,/urgentReminderStatus/);
  assert.match(broadcast,/qstash-scheduled-reminder/);
  assert.match(webhook,/source === 'qstash-reminder'/);
  assert.match(webhook,/upstash-signature/);
  assert.match(webhook,/readRawBody/);
});


test('short urgent reminders can call immediately when QStash is unavailable',()=>{
  const broadcast=readFileSync(new URL('../api/broadcast.js',import.meta.url),'utf8');
  assert.match(broadcast,/immediateDispatch/);
  assert.match(broadcast,/short-reminder-immediate-fallback/);
  assert.match(broadcast,/startOwnerCall/);
  assert.match(broadcast,/provider: 'stellar-inapp'/);
});
