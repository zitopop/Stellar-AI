import { randomUUID } from 'node:crypto';

const PUBLIC_URL = String(process.env.JARVIS_PUBLIC_URL || 'https://trystellarai.com').replace(/\/$/, '');
const E164 = /^\+[1-9]\d{7,14}$/;
const MAX_PURPOSE = 500;
const MAX_CONTACT_NAME = 80;

function config() {
  return {
    accountSid: String(process.env.TWILIO_ACCOUNT_SID || '').trim(),
    authToken: String(process.env.TWILIO_AUTH_TOKEN || '').trim(),
    from: String(process.env.TWILIO_FROM_NUMBER || '').trim(),
  };
}

function configured(c = config()) {
  return /^AC[a-f0-9]{32}$/i.test(c.accountSid)
    && Boolean(c.authToken)
    && E164.test(c.from)
    && Boolean(process.env.KV_REST_API_URL)
    && Boolean(process.env.KV_REST_API_TOKEN);
}

function cleanPurpose(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, MAX_PURPOSE);
}

function cleanContactName(value) {
  return String(value || '').replace(/[\r\n<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_CONTACT_NAME);
}
async function saveContext({ purpose, contactName, to }) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('Jarvis call storage is unavailable.');
  const id = randomUUID();
  const value = JSON.stringify({
    mode: 'outbound-public',
    purpose,
    contactName,
    destinationSuffix: to.slice(-4),
    messages: [],
    silenceCount: 0,
    createdAt: Date.now(),
    metadata: { initiatedBy: 'owner', disclosureRequired: true },
  });
  const command = ['SET', `stellar:jarvis:call:${id}`, value, 'EX', 3600];
  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([command]),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('Jarvis call context could not be stored.');
  return id;
}

async function enforceRateLimit(to) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('Jarvis call storage is unavailable.');
  const day = new Date().toISOString().slice(0, 10);
  const numberKey = `stellar:jarvis:outbound:last:${to}`;
  const dailyKey = `stellar:jarvis:outbound:count:${day}`;
  const [lastResponse, countResponse] = await Promise.all([
    fetch(`${url}/get/${encodeURIComponent(numberKey)}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(3000) }),
    fetch(`${url}/get/${encodeURIComponent(dailyKey)}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(3000) }),
  ]);
  const lastData = await lastResponse.json().catch(() => ({}));
  const countData = await countResponse.json().catch(() => ({}));
  const last = Number(lastData?.result || 0) || 0;
  const count = Number(countData?.result || 0) || 0;
  if (last && Date.now() - last < 10 * 60 * 1000) throw new Error('Please wait before calling this number again.');
  if (count >= 20) throw new Error('The daily outbound-call safety limit has been reached.');
  return { numberKey, dailyKey, count };
}

async function markRateLimit({ numberKey, dailyKey, count }) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  const now = Date.now();
  await Promise.all([
    fetch(`${url}/set/${encodeURIComponent(numberKey)}/${now}?ex=86400`, { headers: { Authorization: `Bearer ${token}` } }),
    fetch(`${url}/set/${encodeURIComponent(dailyKey)}/${count + 1}?ex=172800`, { headers: { Authorization: `Bearer ${token}` } }),
  ]).catch(() => {});
}

export function getOutboundCallConfiguration() {
  return { configured: configured(), provider: configured() ? 'twilio' : 'none' };
}
export async function startOutboundCall({ to, purpose, contactName = '' }) {
  const destination = String(to || '').trim();
  const safePurpose = cleanPurpose(purpose);
  const safeName = cleanContactName(contactName);
  if (!E164.test(destination)) throw new Error('Destination must be a valid E.164 phone number.');
  if (!safePurpose) throw new Error('A call purpose is required.');
  const c = config();
  if (!configured(c)) throw new Error('Outbound calling is not configured.');

  const rate = await enforceRateLimit(destination);
  const contextId = await saveContext({ purpose: safePurpose, contactName: safeName, to: destination });
  const voiceUrl = `${PUBLIC_URL}/api/broadcast?jarvisVoice=1&context=${encodeURIComponent(contextId)}`;
  const statusUrl = `${PUBLIC_URL}/api/broadcast?jarvisVoice=1&status=1&context=${encodeURIComponent(contextId)}`;
  const form = new URLSearchParams();
  form.set('To', destination);
  form.set('From', c.from);
  form.set('Url', voiceUrl);
  form.set('Method', 'POST');
  form.set('StatusCallback', statusUrl);
  form.set('StatusCallbackMethod', 'POST');
  form.append('StatusCallbackEvent', 'completed');
  form.set('Timeout', '25');

  const basic = Buffer.from(`${c.accountSid}:${c.authToken}`).toString('base64');
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(c.accountSid)}/Calls.json`,
    { method: 'POST', headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString(), signal: AbortSignal.timeout(12000) },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.message || 'Twilio could not start the outbound call.');
    error.status = response.status;
    throw error;
  }
  await markRateLimit(rate);
  return {
    ok: true,
    provider: 'twilio',
    call_id: data?.sid || null,
    status: data?.status || 'queued',
    destinationSuffix: destination.slice(-4),
  };
}
