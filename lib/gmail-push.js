import { classifyOwnerAutoCall } from './auto-call-rules.js';
import { routeEmailToTeam } from './email-team-routing.js';
import { escalateOwner } from './owner-escalation.js';

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const HISTORY_KEY = 'stellar:gmail:watch:history';
const EXPIRATION_KEY = 'stellar:gmail:watch:expiration';
const LAST_RENEWED_KEY = 'stellar:gmail:watch:last-renewed';
const MESSAGE_KEY_PREFIX = 'stellar:gmail:called:';
const DEDUPE_TTL_SECONDS = 60 * 60 * 24 * 14;
const WATCH_RENEW_WINDOW_MS = 36 * 60 * 60 * 1000;

function gmailCredentialsConfigured() {
  return Boolean(
    process.env.GMAIL_CLIENT_ID
      && process.env.GMAIL_REFRESH_TOKEN,
  );
}

function kvConfigured() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function topicName() {
  return String(process.env.GMAIL_PUBSUB_TOPIC || '').trim();
}

function validTopic(value) {
  return /^projects\/[^/]+\/topics\/[^/]+$/.test(String(value || ''));
}

function callsEnabled() {
  return String(process.env.GMAIL_CALL_ON_EMAIL || 'true').trim().toLowerCase() !== 'false';
}

async function getAccessToken() {
  if (!gmailCredentialsConfigured()) throw new Error('Gmail OAuth is not configured.');
  const body = new URLSearchParams({
    client_id: String(process.env.GMAIL_CLIENT_ID),
    refresh_token: String(process.env.GMAIL_REFRESH_TOKEN),
    grant_type: 'refresh_token',
  });
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(7000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.access_token) {
    throw new Error(data?.error_description || 'Gmail token refresh failed.');
  }
  return String(data.access_token);
}

async function gmailRequest(path, { method = 'GET', body } = {}) {
  const token = await getAccessToken();
  const response = await fetch(`${GMAIL_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error?.message || `Gmail request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function kvGet(key) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  const response = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(5000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.result == null) return null;
  return String(data.result);
}

async function kvPipeline(commands) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('Gmail notification storage is unavailable.');
  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(7000),
  });
  const data = await response.json().catch(() => []);
  if (!response.ok) throw new Error('Gmail notification storage request failed.');
  return Array.isArray(data) ? data : [];
}

async function setWatchState(historyId, expiration) {
  const stamp = Date.now();
  await kvPipeline([
    ['SET', HISTORY_KEY, String(historyId || '')],
    ['SET', EXPIRATION_KEY, String(expiration || '')],
    ['SET', LAST_RENEWED_KEY, String(stamp)],
  ]);
}

async function setHistoryId(historyId) {
  await kvPipeline([['SET', HISTORY_KEY, String(historyId || '')]]);
}

async function claimMessage(messageId) {
  const key = `${MESSAGE_KEY_PREFIX}${messageId}`;
  const result = await kvPipeline([
    ['SET', key, String(Date.now()), 'EX', DEDUPE_TTL_SECONDS, 'NX'],
  ]);
  return result?.[0]?.result === 'OK';
}

async function releaseMessage(messageId) {
  await kvPipeline([['DEL', `${MESSAGE_KEY_PREFIX}${messageId}`]]).catch(() => {});
}

function header(headers, name) {
  return String(
    (headers || []).find((item) => String(item?.name || '').toLowerCase() === String(name).toLowerCase())?.value || '',
  ).replace(/[\r\n]+/g, ' ').trim();
}

function safePurposePart(value, max = 120) {
  return String(value || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function decodePushData(body) {
  const encoded = String(body?.message?.data || '').trim();
  if (!encoded) return null;
  try {
    return JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

function compareHistoryIds(left, right) {
  try {
    const a = BigInt(String(left || '0'));
    const b = BigInt(String(right || '0'));
    return a === b ? 0 : (a > b ? 1 : -1);
  } catch {
    return String(left || '').localeCompare(String(right || ''));
  }
}

async function listHistoryMessageIds(startHistoryId) {
  const ids = new Set();
  let pageToken = '';
  for (let page = 0; page < 5; page += 1) {
    const params = new URLSearchParams({
      startHistoryId: String(startHistoryId),
      historyTypes: 'messageAdded',
      maxResults: '100',
    });
    if (pageToken) params.set('pageToken', pageToken);
    const data = await gmailRequest(`/history?${params.toString()}`);
    for (const record of data?.history || []) {
      for (const added of record?.messagesAdded || []) {
        if (added?.message?.id) ids.add(String(added.message.id));
      }
    }
    pageToken = String(data?.nextPageToken || '');
    if (!pageToken) break;
  }
  return [...ids];
}

async function listRecentInboxMessageIds() {
  const params = new URLSearchParams({ q: 'in:inbox newer_than:2d', maxResults: '50' });
  const data = await gmailRequest(`/messages?${params.toString()}`);
  return (data?.messages || []).map((item) => String(item?.id || '')).filter(Boolean);
}

async function readMessageSummary(messageId) {
  const params = new URLSearchParams({ format: 'metadata' });
  params.append('metadataHeaders', 'From');
  params.append('metadataHeaders', 'Subject');
  const item = await gmailRequest(`/messages/${encodeURIComponent(messageId)}?${params.toString()}`);
  const labels = new Set((item?.labelIds || []).map((value) => String(value).toUpperCase()));
  return {
    id: String(item?.id || messageId),
    threadId: String(item?.threadId || ''),
    snippet: safePurposePart(item?.snippet, 240),
    from: header(item?.payload?.headers, 'From') || 'Unknown sender',
    subject: header(item?.payload?.headers, 'Subject') || '(no subject)',
    receivedAt: Number(item?.internalDate || 0) || Date.now(),
    inbox: labels.has('INBOX'),
    ignored: ['SENT', 'DRAFT', 'SPAM', 'TRASH'].some((label) => labels.has(label)),
  };
}

async function callOwnerForEmail(message) {
  if (!callsEnabled()) return { called: false, reason: 'disabled' };
  if (!message?.id || !message.inbox || message.ignored) return { called: false, reason: 'not-inbox' };

  const sender = safePurposePart(message.from, 110);
  const subject = safePurposePart(message.subject, 120);
  const route = routeEmailToTeam(message);
  const signal = classifyOwnerAutoCall({
    from: sender,
    subject,
    snippet: message.snippet,
    team: route.team,
    routeReason: route.reason,
  });
  if (!signal.shouldCall) return { called: false, reason: signal.reason || 'not-urgent' };

  const claimed = await claimMessage(message.id);
  if (!claimed) return { called: false, reason: 'duplicate' };

  const summary = ('Email from ' + sender + '. Subject: ' + subject + '. ' + signal.reason + '. Route: ' + route.team + '.').slice(0, 300);
  try {
    const result = await escalateOwner({
      category: signal.category,
      severity: signal.severity,
      summary,
      metadata: {
        trigger: 'gmail',
        team: route,
        email: {
          messageId: message.id,
          threadId: message.threadId,
          from: sender,
          subject,
          snippet: safePurposePart(message.snippet, 240),
          receivedAt: message.receivedAt,
          team: route.team,
          routeReason: route.reason,
          matchedTerm: signal.matchedTerm,
        },
      },
    });
    return { ...result, category: signal.category };
  } catch (error) {
    await releaseMessage(message.id);
    throw error;
  }
}

async function renewWatchIfNeeded() {
  const expiration = Number(await kvGet(EXPIRATION_KEY) || 0);
  if (!expiration || expiration - Date.now() > WATCH_RENEW_WINDOW_MS) return false;
  await startGmailWatch();
  return true;
}

export function getGmailPushConfiguration() {
  return {
    gmailConfigured: gmailCredentialsConfigured(),
    storageConfigured: kvConfigured(),
    topicConfigured: validTopic(topicName()),
    pushTokenConfigured: Boolean(String(process.env.GMAIL_PUSH_TOKEN || '').trim()),
    callsEnabled: callsEnabled(),
  };
}

export async function getGmailWatchStatus() {
  const [historyId, expiration, lastRenewed] = await Promise.all([
    kvGet(HISTORY_KEY),
    kvGet(EXPIRATION_KEY),
    kvGet(LAST_RENEWED_KEY),
  ]);
  return {
    ...getGmailPushConfiguration(),
    active: Boolean(historyId && Number(expiration || 0) > Date.now()),
    historyId: historyId || null,
    expiration: Number(expiration || 0) || null,
    lastRenewed: Number(lastRenewed || 0) || null,
  };
}

export async function startGmailWatch() {
  const topic = topicName();
  if (!gmailCredentialsConfigured()) throw new Error('Gmail OAuth is not configured.');
  if (!kvConfigured()) throw new Error('Gmail notification storage is not configured.');
  if (!validTopic(topic)) throw new Error('GMAIL_PUBSUB_TOPIC is not configured correctly.');

  const data = await gmailRequest('/watch', {
    method: 'POST',
    body: {
      topicName: topic,
      labelIds: ['INBOX'],
      labelFilterBehavior: 'INCLUDE',
    },
  });
  if (!data?.historyId || !data?.expiration) throw new Error('Gmail did not return a valid watch state.');
  await setWatchState(data.historyId, data.expiration);
  return {
    ok: true,
    historyId: String(data.historyId),
    expiration: Number(data.expiration),
  };
}

export async function processGmailPush(body) {
  if (!kvConfigured()) throw new Error('Gmail notification storage is not configured.');
  const notification = decodePushData(body);
  const currentHistoryId = String(notification?.historyId || '').trim();
  if (!currentHistoryId) return { ok: true, called: 0, ignored: true, reason: 'invalid-notification' };

  const expectedEmail = String(process.env.GMAIL_WATCH_EMAIL || '').trim().toLowerCase();
  const notifiedEmail = String(notification?.emailAddress || '').trim().toLowerCase();
  if (expectedEmail && notifiedEmail && expectedEmail !== notifiedEmail) {
    return { ok: true, called: 0, ignored: true, reason: 'wrong-mailbox' };
  }

  const previousHistoryId = await kvGet(HISTORY_KEY);
  if (!previousHistoryId) {
    await setHistoryId(currentHistoryId);
    return { ok: true, called: 0, bootstrapped: true };
  }
  if (compareHistoryIds(currentHistoryId, previousHistoryId) <= 0) {
    return { ok: true, called: 0, duplicate: true };
  }

  let messageIds;
  try {
    messageIds = await listHistoryMessageIds(previousHistoryId);
  } catch (error) {
    if (Number(error?.status) !== 404) throw error;
    messageIds = await listRecentInboxMessageIds();
  }

  let called = 0;
  let skipped = 0;
  for (const messageId of [...new Set(messageIds)]) {
    const message = await readMessageSummary(messageId);
    const result = await callOwnerForEmail(message);
    if (result.called) called += 1;
    else skipped += 1;
  }

  await setHistoryId(currentHistoryId);
  await renewWatchIfNeeded().catch((error) => {
    console.error('Gmail watch auto-renewal failed', error?.message || error);
  });
  return { ok: true, called, skipped, historyId: currentHistoryId };
}
