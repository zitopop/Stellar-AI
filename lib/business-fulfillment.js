import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { generate } from './jarvis-providers.js';
import { verifyQStashSignature } from './qstash-reminders.js';
import { resendSender, SUPPORT_EMAIL } from './email-config.js';
import { escalateOwner } from './owner-escalation.js';

const DEFAULT_PUBLIC_URL = 'https://trystellarai.com';
const DEFAULT_QSTASH_URL = 'https://qstash.upstash.io';
const JOB_PREFIX = 'stellar:business-fulfillment:';
const JOB_INDEX = JOB_PREFIX + 'index';
const RETENTION_SECONDS = 400 * 24 * 60 * 60;
const LEASE_SECONDS = 300;
const CUSTOMER_UPDATE_TTL_SECONDS = 14 * 24 * 60 * 60;
const MAX_PROVIDER_RETRIES = 3;

export const BUSINESS_SERVICES = Object.freeze({
  website_mini_audit: Object.freeze({
    id: 'website_mini_audit',
    label: 'Website Mini Audit / Quick Fix',
    paymentLinkId: 'plink_1UDkfgF96AiVlq463ZdKEbIq',
    initialAmountPence: 9900,
    recurring: false,
  }),
  ai_receptionist: Object.freeze({
    id: 'ai_receptionist',
    label: 'AI Receptionist',
    paymentLinkId: 'plink_1UDYQTF96AiVlq46XSPM5im9',
    setupPriceId: 'price_1UDYQ0F96AiVlq46EFGlhAYv',
    monthlyPriceId: 'price_1UDYQ6F96AiVlq46IwLxBzvQ',
    initialAmountPence: 19900,
    recurring: true,
  }),
});

function envText(name, env = process.env) {
  return String(env?.[name] || '').trim();
}

function qstashBaseUrl(env = process.env) {
  return envText('QSTASH_URL', env).replace(/\/$/, '') || DEFAULT_QSTASH_URL;
}

export function businessFulfillmentDestination(env = process.env) {
  const base = (envText('JARVIS_PUBLIC_URL', env) || DEFAULT_PUBLIC_URL).replace(/\/$/, '');
  return base + '/api/webhook?source=business-fulfillment';
}

function normalizeService(value) {
  const input = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (['website_mini_audit', 'website_audit', 'website_mini_audit_quick_fix'].includes(input)) return 'website_mini_audit';
  if (['ai_receptionist', 'receptionist'].includes(input)) return 'ai_receptionist';
  return '';
}

function objectId(value, prefix) {
  const id = typeof value === 'string' ? value : String(value?.id || '');
  return id.startsWith(prefix) ? id : '';
}

export function businessServiceFromCheckout(session = {}) {
  const metadataService = normalizeService(session?.metadata?.service);
  if (metadataService && BUSINESS_SERVICES[metadataService]) return metadataService;
  const paymentLinkId = objectId(session?.payment_link, 'plink_');
  return Object.values(BUSINESS_SERVICES).find(service => service.paymentLinkId === paymentLinkId)?.id || '';
}

export function checkoutCustomFields(session = {}) {
  const output = {};
  for (const item of Array.isArray(session?.custom_fields) ? session.custom_fields : []) {
    const key = String(item?.key || '').trim().toLowerCase();
    if (!key) continue;
    const value = item?.text?.value ?? item?.dropdown?.value ?? item?.numeric?.value ?? '';
    output[key] = String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1000);
  }
  return output;
}

function hashEmail(email) {
  return createHash('sha256').update(String(email || '').trim().toLowerCase()).digest('hex').slice(0, 32);
}


function updateSecret(env = process.env) {
  return envText('BUSINESS_UPDATE_SECRET', env)
    || envText('AUTH_SESSION_SECRET', env)
    || envText('OWNER_SECRET', env);
}

function secureEqualText(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return Boolean(a.length && a.length === b.length && timingSafeEqual(a, b));
}

export function createBusinessCustomerUpdateToken(job, { env = process.env, now = Date.now } = {}) {
  const secret = updateSecret(env);
  if (!secret || !job?.id || !job?.customerEmail) return '';
  const payload = Buffer.from(JSON.stringify({
    job: String(job.id),
    emailHash: hashEmail(job.customerEmail),
    exp: now() + (CUSTOMER_UPDATE_TTL_SECONDS * 1000),
  })).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return payload + '.' + signature;
}

export function verifyBusinessCustomerUpdateToken(token, job, { env = process.env, now = Date.now } = {}) {
  const secret = updateSecret(env);
  const [payload, signature] = String(token || '').split('.');
  if (!secret || !payload || !signature || !job?.id || !job?.customerEmail) return false;
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  if (!secureEqualText(signature, expected)) return false;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return decoded?.job === job.id
      && decoded?.emailHash === hashEmail(job.customerEmail)
      && Number(decoded?.exp) > now();
  } catch {
    return false;
  }
}

function cleanDetail(value, max = 1000) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function validateBusinessFulfillmentDetails(job = {}) {
  const details = job?.details || {};
  const issues = [];
  const website = cleanDetail(details.website, 500);
  const normalizedWebsite = website ? normalizePublicUrl(website) : '';

  if (job.service === 'website_mini_audit') {
    if (!website) issues.push({ field: 'website', message: 'Add the website URL you want Stellar to audit.' });
    else if (!normalizedWebsite) issues.push({ field: 'website', message: 'Enter a valid public website URL, such as https://example.com.' });
    if (cleanDetail(details.mainIssue, 1000).length < 8) {
      issues.push({ field: 'mainIssue', message: 'Describe the main website problem in a little more detail.' });
    }
  } else if (job.service === 'ai_receptionist') {
    if (cleanDetail(details.businessFacts, 2000).length < 20) {
      issues.push({ field: 'businessFacts', message: 'Add the core business facts the receptionist is allowed to use: services, hours/contact/booking details where relevant.' });
    }
    if (website && !normalizedWebsite) {
      issues.push({ field: 'website', message: 'The website/social link is not a valid public URL. Correct it or leave it blank.' });
    }
    if (cleanDetail(details.customDomain, 80).length < 2) {
      issues.push({ field: 'customDomain', message: 'Choose whether you want the included Stellar URL or an existing business domain.' });
    }
  }

  return { ok: issues.length === 0, issues };
}

function issueFingerprint(issues = []) {
  return createHash('sha256').update(JSON.stringify(issues.map(issue => [issue.field, issue.message]))).digest('hex').slice(0, 20);
}

async function sendCustomerInfoRequest(job, issues, { fetcher = fetch, env = process.env, now = Date.now } = {}) {
  const apiKey = envText('RESEND_API_KEY', env);
  const from = resendSender();
  const token = createBusinessCustomerUpdateToken(job, { env, now });
  if (!apiKey || !from || !token) return { ok: false, reason: 'email-or-signing-not-configured' };

  const fingerprint = issueFingerprint(issues);
  if (job?.customerInfoRequest?.fingerprint === fingerprint && Number(job?.customerInfoRequest?.sentAt || 0) > now() - 6 * 60 * 60 * 1000) {
    return { ok: true, duplicate: true, fingerprint };
  }

  const updateUrl = DEFAULT_PUBLIC_URL + '/business-order-update.html?job=' + encodeURIComponent(job.id) + '&token=' + encodeURIComponent(token);
  const bulletText = issues.map(issue => '- ' + issue.message).join('\n');
  const response = await fetcher('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
      'Idempotency-Key': 'stellar-business-info-' + job.id + '-' + fingerprint,
    },
    body: JSON.stringify({
      from,
      to: [job.customerEmail],
      reply_to: SUPPORT_EMAIL,
      subject: 'A quick detail is needed for your ' + job.serviceLabel,
      text: 'Thanks for your Stellar AI order. We can continue automatically once these details are confirmed:\n\n'
        + bulletText
        + '\n\nUpdate your order securely here:\n' + updateUrl
        + '\n\nStellar will re-check and resume the paid job automatically after you submit. Do not send passwords, card numbers, API keys or other secrets.',
    }),
    signal: AbortSignal.timeout(10000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.id) return { ok: false, reason: 'email-provider-rejected' };
  return { ok: true, fingerprint, providerMessageId: String(data.id), sentAt: now(), updateUrl };
}

export async function getBusinessCustomerUpdateView(jobId, token, options = {}) {
  const job = await loadBusinessFulfillmentJob(jobId, options);
  if (!job || !verifyBusinessCustomerUpdateToken(token, job, options)) return null;
  const validation = validateBusinessFulfillmentDetails(job);
  return {
    jobId: job.id,
    service: job.service,
    serviceLabel: job.serviceLabel,
    status: job.status,
    details: {
      website: cleanDetail(job.details?.website, 500),
      mainIssue: cleanDetail(job.details?.mainIssue, 1000),
      businessFacts: cleanDetail(job.details?.businessFacts, 2000),
      customDomain: cleanDetail(job.details?.customDomain, 80),
    },
    issues: validation.issues,
  };
}

export async function applyBusinessCustomerUpdate({ jobId, token, details = {}, fetcher = fetch, env = process.env, now = Date.now } = {}) {
  const job = await loadBusinessFulfillmentJob(jobId, { fetcher, env });
  if (!job || !verifyBusinessCustomerUpdateToken(token, job, { env, now })) {
    return { ok: false, status: 403, error: 'This update link is invalid or has expired.' };
  }

  const allowed = job.service === 'website_mini_audit'
    ? {
        website: cleanDetail(details.website, 500),
        mainIssue: cleanDetail(details.mainIssue, 1000),
      }
    : {
        website: cleanDetail(details.website, 500),
        businessFacts: cleanDetail(details.businessFacts, 2000),
        customDomain: cleanDetail(details.customDomain, 80),
      };

  const next = { ...job, details: { ...job.details, ...allowed } };
  const validation = validateBusinessFulfillmentDetails(next);
  if (!validation.ok) {
    const waiting = await patchJob(job.id, {
      status: 'waiting_for_customer',
      details: next.details,
      validationIssues: validation.issues,
      customerUpdatedAt: now(),
      error: null,
    }, { fetcher, env });
    return { ok: false, status: 422, issues: validation.issues, jobStatus: waiting?.status || 'waiting_for_customer' };
  }

  const queued = await patchJob(job.id, {
    status: 'queued',
    details: next.details,
    validationIssues: [],
    customerUpdatedAt: now(),
    failureCount: 0,
    error: null,
  }, { fetcher, env });
  const publish = await enqueueBusinessFulfillment(queued, { fetcher, env });
  if (!publish?.queued) {
    await patchJob(job.id, { status: 'retrying', error: 'The updated job could not be queued yet.' }, { fetcher, env }).catch(() => {});
    return { ok: true, status: 202, jobStatus: 'retrying', queued: false };
  }
  return { ok: true, status: 200, jobStatus: 'queued', queued: true };
}

async function redisPipeline(commands, { fetcher = fetch, env = process.env } = {}) {
  const url = envText('KV_REST_API_URL', env).replace(/\/$/, '');
  const token = envText('KV_REST_API_TOKEN', env);
  if (!url || !token) throw new Error('Business fulfilment storage is not configured.');
  const response = await fetcher(url + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(8000),
  });
  const data = await response.json().catch(() => []);
  if (!response.ok) throw new Error('Business fulfilment storage is unavailable.');
  return Array.isArray(data) ? data : [];
}

function jobKey(id) {
  return JOB_PREFIX + 'job:' + String(id || '');
}

function emailIndex(email) {
  return JOB_PREFIX + 'customer:' + hashEmail(email);
}

function leaseKey(id) {
  return JOB_PREFIX + 'lease:' + String(id || '');
}

export async function createBusinessFulfillmentJob(session, { fetcher = fetch, env = process.env, now = Date.now } = {}) {
  const serviceId = businessServiceFromCheckout(session);
  const service = BUSINESS_SERVICES[serviceId];
  if (!service) return null;

  const email = String(session?.metadata?.email || session?.customer_details?.email || session?.customer_email || '').trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Paid business order is missing a valid customer email.');
  const paid = session?.payment_status === 'paid' || session?.payment_status === 'no_payment_required';
  if (!paid) return null;
  if (String(session?.currency || '').toLowerCase() !== 'gbp') throw new Error('Paid business order used an unexpected currency.');
  if (Number(session?.amount_total) !== service.initialAmountPence) throw new Error('Paid business order used an unexpected amount.');

  const subscriptionId = objectId(session?.subscription, 'sub_');
  if (service.recurring && !subscriptionId) throw new Error('AI Receptionist checkout is missing its subscription.');
  const customerId = objectId(session?.customer, 'cus_');
  const fields = checkoutCustomFields(session);
  const createdAt = now();
  const id = String(session?.id || '').trim();
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) throw new Error('Business order is missing a Checkout Session ID.');

  const details = serviceId === 'website_mini_audit'
    ? {
        website: String(fields.website || '').slice(0, 500),
        mainIssue: String(fields.mainissue || '').slice(0, 500),
      }
    : {
        website: String(fields.website || '').slice(0, 500),
        businessFacts: String(fields.businessfacts || '').slice(0, 1200),
        customDomain: String(fields.customdomain || '').slice(0, 80),
      };

  const job = {
    id,
    version: 1,
    service: serviceId,
    serviceLabel: service.label,
    status: 'queued',
    customerEmail: email,
    customerName: String(session?.customer_details?.name || '').trim().slice(0, 160) || null,
    stripeCustomerId: customerId || null,
    stripeSubscriptionId: subscriptionId || null,
    checkoutSessionId: id,
    paymentLinkId: objectId(session?.payment_link, 'plink_') || null,
    amountPence: service.initialAmountPence,
    currency: 'gbp',
    details,
    createdAt,
    updatedAt: createdAt,
    draft: null,
    error: null,
  };

  const results = await redisPipeline([[
    'EVAL',
    "local existing=redis.call('GET',KEYS[1]); if existing then return existing end; redis.call('SET',KEYS[1],ARGV[1],'EX',ARGV[5]); redis.call('ZADD',KEYS[2],ARGV[2],ARGV[3]); redis.call('EXPIRE',KEYS[2],ARGV[5]); redis.call('ZADD',KEYS[3],ARGV[2],ARGV[3]); redis.call('EXPIRE',KEYS[3],ARGV[5]); return ARGV[1]",
    3,
    jobKey(id),
    JOB_INDEX,
    emailIndex(email),
    JSON.stringify(job),
    createdAt,
    id,
    email,
    RETENTION_SECONDS,
  ]], { fetcher, env });
  const raw = results?.[0]?.result;
  return raw ? JSON.parse(raw) : job;
}

export async function loadBusinessFulfillmentJob(id, options = {}) {
  const results = await redisPipeline([['GET', jobKey(id)]], options);
  const raw = results?.[0]?.result;
  return raw ? JSON.parse(raw) : null;
}

export async function listBusinessFulfillmentJobs({ limit = 50, email = '', ...options } = {}) {
  const max = Math.max(1, Math.min(100, Number(limit) || 50));
  const index = email ? emailIndex(email) : JOB_INDEX;
  const idsResult = await redisPipeline([['ZREVRANGE', index, 0, max - 1]], options);
  const ids = Array.isArray(idsResult?.[0]?.result) ? idsResult[0].result : [];
  if (!ids.length) return [];
  const rows = await redisPipeline([['MGET', ...ids.map(jobKey)]], options);
  return (rows?.[0]?.result || []).filter(Boolean).map(value => JSON.parse(value));
}

async function patchJob(id, patch, options = {}) {
  const at = Number(patch?.updatedAt) || Date.now();
  const results = await redisPipeline([[
    'EVAL',
    "local raw=redis.call('GET',KEYS[1]); if not raw then return nil end; local job=cjson.decode(raw); local patch=cjson.decode(ARGV[1]); for k,v in pairs(patch) do job[k]=v end; job.updatedAt=tonumber(ARGV[2]); local encoded=cjson.encode(job); redis.call('SET',KEYS[1],encoded,'EX',ARGV[3]); return encoded",
    1,
    jobKey(id),
    JSON.stringify(patch || {}),
    at,
    RETENTION_SECONDS,
  ]], options);
  const raw = results?.[0]?.result;
  return raw ? JSON.parse(raw) : null;
}

export async function updateBusinessServiceBilling(email, patch = {}, options = {}) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return false;
  const key = JOB_PREFIX + 'service:ai_receptionist:' + hashEmail(normalized);
  const now = Date.now();
  const results = await redisPipeline([[
    'EVAL',
    "local raw=redis.call('GET',KEYS[1]); local value={}; if raw then value=cjson.decode(raw) end; local patch=cjson.decode(ARGV[1]); for k,v in pairs(patch) do value[k]=v end; value.email=ARGV[2]; value.updatedAt=tonumber(ARGV[3]); local encoded=cjson.encode(value); redis.call('SET',KEYS[1],encoded,'EX',ARGV[4]); return encoded",
    1,
    key,
    JSON.stringify(patch || {}),
    normalized,
    now,
    RETENTION_SECONDS,
  ]], options);
  return Boolean(results?.[0]?.result);
}

export function subscriptionHasAiReceptionist(subscription = {}) {
  const service = BUSINESS_SERVICES.ai_receptionist;
  if (normalizeService(subscription?.metadata?.service) === 'ai_receptionist') return true;
  return (subscription?.items?.data || []).some(item => {
    const priceId = objectId(item?.price, 'price_') || String(item?.price?.id || '');
    return priceId === service.monthlyPriceId;
  });
}

export function invoiceHasAiReceptionist(invoice = {}) {
  const service = BUSINESS_SERVICES.ai_receptionist;
  return (invoice?.lines?.data || []).some(line => {
    const ids = [
      String(line?.price?.id || ''),
      String(line?.pricing?.price_details?.price || ''),
      String(line?.pricing?.price_details?.price_id || ''),
    ];
    return ids.includes(service.monthlyPriceId);
  });
}

export async function enqueueBusinessFulfillment(job, { fetcher = fetch, env = process.env } = {}) {
  if (!job?.id) return { queued: false, reason: 'missing-job' };
  const token = envText('QSTASH_TOKEN', env);
  if (!token) return { queued: false, reason: 'qstash-not-configured' };
  const destination = businessFulfillmentDestination(env);
  const response = await fetcher(qstashBaseUrl(env) + '/v2/publish/' + encodeURIComponent(destination), {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      'Upstash-Retries': '3',
      'Upstash-Retry-Delay': 'max(1000, pow(2, retried) * 1000)',
      'Upstash-Timeout': '40s',
      'Upstash-Deduplication-Id': 'stellar-business-' + job.id,
      'Upstash-Label': 'stellar-business-fulfillment',
    },
    body: JSON.stringify({ version: 1, jobId: job.id }),
    signal: AbortSignal.timeout(10000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.messageId) {
    return { queued: false, reason: 'qstash-publish-failed', httpStatus: response.status };
  }
  await patchJob(job.id, { queueMessageId: String(data.messageId), queuePublishedAt: Date.now() }, { fetcher, env }).catch(() => {});
  return { queued: true, messageId: String(data.messageId), deduplicated: data?.deduplicated === true };
}

function privateIpv4(address) {
  const parts = String(address).split('.').map(Number);
  if (parts.length !== 4 || parts.some(value => !Number.isInteger(value) || value < 0 || value > 255)) return true;
  const [a, b, c] = parts;
  return a === 0 || a === 10 || a === 127 || a >= 224
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 192 && b === 0)
    || (a === 192 && b === 0 && c === 2)
    || (a === 198 && (b === 18 || b === 19 || b === 51))
    || (a === 203 && b === 0 && c === 113);
}

function privateIp(address) {
  const value = String(address || '').toLowerCase();
  const version = isIP(value);
  if (version === 4) return privateIpv4(value);
  if (version !== 6) return true;
  if (value === '::1' || value === '::') return true;
  if (value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe8') || value.startsWith('fe9') || value.startsWith('fea') || value.startsWith('feb') || value.startsWith('2001:db8:')) return true;
  if (value.startsWith('::ffff:')) return privateIpv4(value.slice(7));
  return false;
}

function normalizePublicUrl(value) {
  let text = String(value || '').trim().slice(0, 1000);
  if (!text) return '';
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) text = 'https://' + text;
  try {
    const url = new URL(text);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return '';
    const host = url.hostname.toLowerCase();
    if (!host || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return '';
    url.hash = '';
    return url.href;
  } catch {
    return '';
  }
}

async function assertPublicHost(url) {
  const host = new URL(url).hostname;
  if (isIP(host)) {
    if (privateIp(host)) throw new Error('Customer website URL points to a non-public address.');
    return;
  }
  const records = await lookup(host, { all: true, verbatim: true });
  if (!records.length || records.some(record => privateIp(record.address))) throw new Error('Customer website URL did not resolve to a public address.');
}

function htmlToText(html) {
  return String(html || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 30000);
}

async function fetchPublicWebsiteSnapshot(value, { fetcher = fetch } = {}) {
  let current = normalizePublicUrl(value);
  if (!current) return { ok: false, reason: 'missing-or-invalid-url', url: null, text: '' };
  for (let redirect = 0; redirect < 3; redirect += 1) {
    await assertPublicHost(current);
    const response = await fetcher(current, {
      method: 'GET',
      headers: { 'User-Agent': 'StellarAIFulfillment/1.0 (+https://trystellarai.com)', Accept: 'text/html,text/plain;q=0.9' },
      redirect: 'manual',
      signal: AbortSignal.timeout(9000),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) return { ok: false, reason: 'redirect-without-location', url: current, text: '' };
      current = normalizePublicUrl(new URL(location, current).href);
      if (!current) return { ok: false, reason: 'invalid-redirect', url: null, text: '' };
      continue;
    }
    if (!response.ok) return { ok: false, reason: 'http-' + response.status, url: current, text: '' };
    const type = String(response.headers.get('content-type') || '').toLowerCase();
    if (!type.includes('text/html') && !type.includes('text/plain')) return { ok: false, reason: 'unsupported-content', url: current, text: '' };
    const raw = (await response.text()).slice(0, 250000);
    return { ok: true, reason: null, url: current, text: type.includes('html') ? htmlToText(raw) : raw.replace(/\s+/g, ' ').trim().slice(0, 30000) };
  }
  return { ok: false, reason: 'too-many-redirects', url: current, text: '' };
}

function objectiveFor(job) {
  if (job.service === 'website_mini_audit') {
    return [
      'Prepare a first-pass Website Mini Audit / Quick Fix draft for paid customer review.',
      'Use only the supplied customer issue and fetched public-page evidence.',
      'Separate confirmed observations from assumptions. Do not invent analytics, traffic, conversions, broken forms, rankings, security findings or business facts.',
      'Return: executive summary, confirmed findings with evidence, prioritized fixes (high/medium/low), quick wins, items that require manual verification, and a final QA checklist.',
      'This is an internal draft, not a claim that work was published or completed.',
    ].join(' ');
  }
  return [
    'Prepare an internal AI Receptionist setup draft for a paid customer.',
    'Treat the submitted business facts as the only approved facts. Website text is supplemental evidence and must not override explicit customer facts.',
    'Return: approved facts, proposed FAQ answers, lead-capture fields, escalation rules, refusal/safety boundaries, domain/setup notes, unresolved questions, and a launch QA checklist.',
    'Do not invent services, prices, opening hours, booking rules, availability or regulated advice. Do not claim the receptionist is live.',
  ].join(' ');
}

export async function deliverBusinessFulfillment({
  rawBody,
  signature,
  upstashRegion = '',
  fetcher = fetch,
  env = process.env,
  now = Date.now,
} = {}) {
  const destination = businessFulfillmentDestination(env);
  if (!verifyQStashSignature({ rawBody, signature, url: destination, env, now: now() })) {
    const error = new Error('Invalid QStash signature.');
    error.status = 403;
    throw error;
  }
  let payload;
  try {
    payload = JSON.parse(typeof rawBody === 'string' ? rawBody : Buffer.from(rawBody || '').toString('utf8'));
  } catch {
    const error = new Error('Invalid business fulfilment payload.');
    error.status = 400;
    throw error;
  }
  const jobId = String(payload?.jobId || '').trim();
  if (!/^cs_[A-Za-z0-9_]+$/.test(jobId)) {
    const error = new Error('Invalid business fulfilment job ID.');
    error.status = 400;
    throw error;
  }

  const leaseToken = createHash('sha256').update(jobId + ':' + now() + ':' + Math.random()).digest('hex');
  const leaseResult = await redisPipeline([['SET', leaseKey(jobId), leaseToken, 'EX', LEASE_SECONDS, 'NX']], { fetcher, env });
  if (leaseResult?.[0]?.result !== 'OK') {
    return { ok: true, duplicate: true, job: await loadBusinessFulfillmentJob(jobId, { fetcher, env }) };
  }

  try {
    const job = await loadBusinessFulfillmentJob(jobId, { fetcher, env });
    if (!job) {
      const error = new Error('Business fulfilment job was not found.');
      error.status = 404;
      throw error;
    }
    if (job.status === 'draft_ready_review') return { ok: true, duplicate: true, job };

    await patchJob(jobId, { status: 'processing', processingStartedAt: now(), error: null }, { fetcher, env });
    const website = String(job?.details?.website || '');
    const snapshot = website ? await fetchPublicWebsiteSnapshot(website, { fetcher }).catch(error => ({ ok: false, reason: String(error?.message || 'fetch-failed').slice(0, 160), url: normalizePublicUrl(website) || null, text: '' })) : { ok: false, reason: 'not-provided', url: null, text: '' };

    const context = {
      service: job.service,
      customerEmail: job.customerEmail,
      customerName: job.customerName,
      submittedDetails: job.details,
      publicWebsite: {
        fetched: snapshot.ok,
        url: snapshot.url,
        fetchNote: snapshot.reason,
        pageText: snapshot.text,
      },
      safeguards: {
        externalActionsRequireReview: true,
        publishingNotAuthorized: true,
        refundsNotAuthorized: true,
        dnsChangesNotAuthorized: true,
      },
    };

    const result = await generate({
      role: 'operations',
      objective: objectiveFor(job),
      context,
    });
    const completed = await patchJob(jobId, {
      status: 'draft_ready_review',
      draft: String(result?.text || '').slice(0, 30000),
      draftSources: Array.isArray(result?.sources) ? result.sources.slice(0, 8) : [],
      websiteSnapshot: { fetched: snapshot.ok, url: snapshot.url, note: snapshot.reason || null },
      processedBy: 'qstash-business-fulfillment',
      qstashRegion: String(upstashRegion || '').slice(0, 40) || null,
      completedAt: now(),
      error: null,
    }, { fetcher, env });
    return { ok: true, status: completed?.status || 'draft_ready_review', job: completed };
  } catch (error) {
    await patchJob(jobId, {
      status: 'processing_failed',
      error: String(error?.message || error).slice(0, 240),
      failedAt: now(),
    }, { fetcher, env }).catch(() => {});
    throw error;
  } finally {
    await redisPipeline([['EVAL', "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0", 1, leaseKey(jobId), leaseToken]], { fetcher, env }).catch(() => {});
  }
}
