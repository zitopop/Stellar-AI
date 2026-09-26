import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (name) => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const vercel = JSON.parse(read('vercel.json'));

const policies = {
  '/legal': 'legal.html',
  '/refunds': 'refunds.html',
  '/cookies': 'cookies.html',
  '/acceptable-use': 'acceptable-use.html',
  '/business-terms': 'business-terms.html',
};

test('customer legal policy suite has clean public routes and html redirects', () => {
  const rewrites = new Map((vercel.rewrites || []).map((r) => [r.source, r.destination]));
  const redirects = new Map((vercel.redirects || []).map((r) => [r.source, r]));
  for (const [route, file] of Object.entries(policies)) {
    assert.equal(rewrites.get(route), '/' + file, route);
    assert.equal(redirects.get('/' + file)?.destination, route, file);
    assert.equal(redirects.get('/' + file)?.permanent, true, file + ' redirect');
  }
});

test('refund policy exposes cancellation, recurring billing and wallet-credit remedies', () => {
  const refunds = read('refunds.html');
  assert.match(refunds, /Refund & Cancellation Policy/);
  assert.match(refunds, /Manage subscription/);
  assert.match(refunds, /14 day|14-day|statutory cancellation/i);
  assert.match(refunds, /Simple cancellation form/);
  assert.match(refunds, /Website Mini Audit/);
  assert.match(refunds, /AI Receptionist/);
  assert.match(refunds, /failed AI requests/i);
});

test('cookie and acceptable-use pages match current product behaviour', () => {
  const cookies = read('cookies.html');
  const acceptable = read('acceptable-use.html');
  assert.match(cookies, /does not currently use advertising cookies or cross-site behavioural advertising trackers/i);
  assert.match(cookies, /localStorage/);
  assert.match(cookies, /service-worker caches/);
  assert.match(cookies, /first-party product metrics/i);
  assert.match(acceptable, /StellarX and connected computers/);
  assert.match(acceptable, /Malware and harmful code/);
  assert.match(acceptable, /credit balance does not create a right to unlimited concurrency/i);
});

test('business service pages put legal disclosure before final Stripe checkout', () => {
  for (const file of ['services/website-audit.html','services/ai-receptionist.html']) {
    const html = read(file);
    assert.match(html, /href="#buy"/);
    assert.match(html, /id="buy"/);
    assert.match(html, /Business Services Terms/);
    assert.match(html, /Refund & Cancellation Policy/);
    assert.equal((html.match(/href="https:\/\/buy\.stripe\.com/g) || []).length, 1, file + ' should expose one final Stripe href');
    assert.match(html, /Continue to secure Stripe checkout/);
  }
});

test('main customer surfaces link the legal suite and sitemap publishes clean legal URLs', () => {
  const index = read('index.html');
  const app = read('app.html');
  const support = read('support.html');
  const sitemap = read('sitemap.xml');
  assert.match(index, /href="\/refunds"/);
  assert.match(index, /href="\/legal"/);
  assert.match(app, /Legal & policies/);
  assert.match(support, /href="\/refunds"/);
  for (const route of Object.keys(policies)) assert.ok(sitemap.includes('https://trystellarai.com' + route), route);
});

test('business terms are scoped and do not promise commercial outcomes', () => {
  const terms = read('business-terms.html');
  assert.match(terms, /£99 one-time/);
  assert.match(terms, /£150 setup \+ £49\/month/);
  assert.match(terms, /do not guarantee rankings, traffic, customer enquiries, bookings, response rates, sales, revenue/i);
});