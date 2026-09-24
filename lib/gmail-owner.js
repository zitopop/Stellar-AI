const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

function configured() {
  return Boolean(
    process.env.GMAIL_CLIENT_ID &&
    process.env.GMAIL_REFRESH_TOKEN
  );
}

async function getAccessToken() {
  if (!configured()) return '';
  const body = new URLSearchParams({
    client_id: String(process.env.GMAIL_CLIENT_ID),
    refresh_token: String(process.env.GMAIL_REFRESH_TOKEN),
    grant_type: 'refresh_token',
  });
  const clientSecret = String(process.env.GMAIL_CLIENT_SECRET || '').trim();
  if (clientSecret) body.set('client_secret', clientSecret);
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(5000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.access_token) throw new Error(data?.error_description || 'Gmail token refresh failed');
  return String(data.access_token);
}

function decodeBase64Url(value) {
  if (!value) return '';
  try {
    const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(normalized, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

function encodeBase64Url(value) {
  return Buffer.from(String(value || ''), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function header(headers, name) {
  return String((headers || []).find((item) => String(item?.name || '').toLowerCase() === name.toLowerCase())?.value || '');
}

function collectText(part, output = []) {
  if (!part) return output;
  const mime = String(part.mimeType || '').toLowerCase();
  if (mime === 'text/plain' && part.body?.data) output.push(decodeBase64Url(part.body.data));
  for (const child of part.parts || []) collectText(child, output);
  return output;
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function bodyText(payload, snippet) {
  const plain = collectText(payload).join('\n').trim();
  if (plain) return plain;
  if (String(payload?.mimeType || '').toLowerCase() === 'text/html' && payload?.body?.data) {
    return stripHtml(decodeBase64Url(payload.body.data));
  }
  return String(snippet || '').trim();
}

function safeQuery(input) {
  const text = String(input || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 240);
  if (!text) return 'newer_than:30d';
  const cleaned = text
    .replace(/\b(?:email|emails|mail|gmail|inbox|message|messages|read|show|find|check|latest|last|from|about|please|can you|could you|what did|what does|say|tell me)\b/gi, ' ')
    .replace(/[^a-z0-9@._+\-\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return 'newer_than:30d';
  return `newer_than:180d ${cleaned}`.slice(0, 300);
}

function looksLikeEmailRequest(speech) {
  return /\b(?:email|emails|gmail|inbox|mail|message|messages)\b/i.test(String(speech || ''));
}

async function gmailFetch(path, token) {
  const response = await fetch(`${GMAIL_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(5000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || 'Gmail request failed');
  return data;
}

async function gmailPost(path, token, body) {
  const response = await fetch(`${GMAIL_API}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error?.message || 'Gmail write request failed');
    error.status = response.status;
    throw error;
  }
  return data;
}

function parseAddress(value) {
  const text = String(value || '').trim();
  const angled = text.match(/<([^<>\s]+@[^<>\s]+)>/);
  const bare = text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
  return String(angled?.[1] || bare?.[0] || '').trim().toLowerCase();
}

function replySubject(value) {
  const subject = String(value || '').trim().slice(0, 220);
  if (!subject) return '';
  return /^re:/i.test(subject) ? subject : `Re: ${subject}`;
}

function cleanTargetPhrase(value) {
  return String(value || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[^a-z0-9@._+\-\s']/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function requestedBody(speech) {
  const text = String(speech || '').trim();
  const match = text.match(/\b(?:saying|say|tell (?:them|him|her)|message(?: them| him| her)?(?: saying)?|with (?:the )?message)\b[\s,:-]*(.+)$/i);
  return String(match?.[1] || '').trim().slice(0, 5000);
}

function targetPhrase(speech) {
  const text = String(speech || '').replace(/[\r\n]+/g, ' ').trim();
  const direct = parseAddress(text);
  if (direct) return direct;
  const match = text.match(/\b(?:email|message|reply to)\s+(.+?)(?=\s+(?:saying|say|tell|with (?:the )?message)\b|$)/i);
  return cleanTargetPhrase(match?.[1] || '');
}

async function gmailProfile(token) {
  const profile = await gmailFetch('/profile', token);
  return {
    emailAddress: String(profile?.emailAddress || '').trim().toLowerCase(),
    messagesTotal: Number(profile?.messagesTotal || 0) || 0,
    threadsTotal: Number(profile?.threadsTotal || 0) || 0,
  };
}

export async function getOwnerEmailProfile() {
  if (!configured()) return { configured: false, emailAddress: '' };
  try {
    const token = await getAccessToken();
    const profile = await gmailProfile(token);
    return { configured: true, ...profile };
  } catch (error) {
    console.error('Owner Gmail profile lookup failed', error?.message || error);
    return { configured: true, emailAddress: '', error: 'Gmail profile lookup failed temporarily.' };
  }
}

async function resolveReplyTarget(token, phrase, ownerEmail = '') {
  const clean = cleanTargetPhrase(phrase);
  if (!clean) return null;
  const direct = parseAddress(clean);
  if (direct) return { to: direct, subject: '', threadId: '', inReplyTo: '', references: '', source: 'direct' };

  const query = `newer_than:365d -from:me ${clean}`.slice(0, 300);
  const list = await gmailFetch(`/messages?q=${encodeURIComponent(query)}&maxResults=8`, token);
  const ids = (list?.messages || []).map((item) => item?.id).filter(Boolean).slice(0, 8);
  for (const id of ids) {
    const item = await gmailFetch(`/messages/${encodeURIComponent(id)}?format=full`, token);
    const headers = item?.payload?.headers || [];
    const from = header(headers, 'From');
    const replyTo = header(headers, 'Reply-To') || from;
    const to = parseAddress(replyTo);
    if (!to || (ownerEmail && to === ownerEmail)) continue;
    return {
      to,
      display: String(from || replyTo).slice(0, 220),
      subject: replySubject(header(headers, 'Subject')),
      threadId: String(item?.threadId || ''),
      inReplyTo: header(headers, 'Message-ID').slice(0, 500),
      references: header(headers, 'References').slice(0, 1500),
      source: 'thread',
    };
  }
  return null;
}

export async function prepareOwnerEmailDraft(speech) {
  if (!configured()) return { ok: false, reason: 'not-configured' };
  const body = requestedBody(speech);
  if (!body) return { ok: false, reason: 'missing-body' };
  const phrase = targetPhrase(speech);
  if (!phrase) return { ok: false, reason: 'missing-recipient' };

  try {
    const token = await getAccessToken();
    const profile = await gmailProfile(token);
    const target = await resolveReplyTarget(token, phrase, profile.emailAddress);
    if (!target) return { ok: false, reason: 'recipient-not-found', ownerEmail: profile.emailAddress };
    return {
      ok: true,
      ownerEmail: profile.emailAddress,
      draft: {
        to: target.to,
        display: target.display || target.to,
        subject: target.subject || '',
        body,
        threadId: target.threadId || '',
        inReplyTo: target.inReplyTo || '',
        references: target.references || '',
        source: target.source || 'direct',
      },
    };
  } catch (error) {
    console.error('Owner Gmail draft preparation failed', error?.message || error);
    return { ok: false, reason: 'gmail-error' };
  }
}

function buildRawMessage(draft) {
  const to = parseAddress(draft?.to);
  const subject = String(draft?.subject || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 220);
  const body = String(draft?.body || '').trim().slice(0, 10000);
  if (!to || !body) throw new Error('Email recipient or body is missing.');
  const lines = [
    `To: ${to}`,
    subject ? `Subject: ${subject}` : '',
    draft?.inReplyTo ? `In-Reply-To: ${String(draft.inReplyTo).replace(/[\r\n]+/g, ' ').slice(0, 500)}` : '',
    draft?.references ? `References: ${String(draft.references).replace(/[\r\n]+/g, ' ').slice(0, 1500)}` : '',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    body,
  ].filter((line) => line !== '');
  return encodeBase64Url(lines.join('\r\n'));
}

export async function sendOwnerPreparedEmail(draft) {
  if (!configured()) return { ok: false, reason: 'not-configured' };
  try {
    const token = await getAccessToken();
    const raw = buildRawMessage(draft);
    const payload = { raw };
    if (draft?.threadId) payload.threadId = String(draft.threadId);
    const sent = await gmailPost('/messages/send', token, payload);
    return {
      ok: true,
      messageId: String(sent?.id || ''),
      threadId: String(sent?.threadId || draft?.threadId || ''),
      to: parseAddress(draft?.to),
    };
  } catch (error) {
    console.error('Owner Gmail send failed', error?.status || '', error?.message || error);
    return {
      ok: false,
      reason: error?.status === 403 ? 'send-permission' : 'gmail-error',
    };
  }
}

export async function getOwnerEmailContext(speech) {
  if (!looksLikeEmailRequest(speech)) return { requested: false, configured: configured(), context: '' };
  if (!configured()) return { requested: true, configured: false, context: '' };

  try {
    const token = await getAccessToken();
    const profile = await gmailProfile(token);
    const query = safeQuery(speech);
    const list = await gmailFetch(`/messages?q=${encodeURIComponent(query)}&maxResults=5`, token);
    const ids = (list?.messages || []).slice(0, 5).map((item) => item?.id).filter(Boolean);
    if (!ids.length) {
      return {
        requested: true,
        configured: true,
        ownerEmail: profile.emailAddress,
        context: `Connected owner Gmail: ${profile.emailAddress || 'address unavailable'}\nNo matching email was found.`,
      };
    }

    const messages = await Promise.all(ids.map(async (id) => {
      const item = await gmailFetch(`/messages/${encodeURIComponent(id)}?format=full`, token);
      const headers = item?.payload?.headers || [];
      return {
        from: header(headers, 'From').slice(0, 220),
        subject: header(headers, 'Subject').slice(0, 220),
        date: header(headers, 'Date').slice(0, 120),
        body: bodyText(item?.payload, item?.snippet).replace(/\s+/g, ' ').trim().slice(0, 1800),
      };
    }));

    const context = [
      `Connected owner Gmail: ${profile.emailAddress || 'address unavailable'}`,
      '',
      messages.map((message, index) => [
        `EMAIL ${index + 1}`,
        `From: ${message.from || 'Unknown'}`,
        `Subject: ${message.subject || '(no subject)'}`,
        `Date: ${message.date || 'Unknown'}`,
        `Body: ${message.body || '(no readable body)'}`,
      ].join('\n')).join('\n\n'),
    ].join('\n').slice(0, 7200);

    return { requested: true, configured: true, ownerEmail: profile.emailAddress, context };
  } catch (error) {
    console.error('Owner Gmail lookup failed', error?.message || error);
    return { requested: true, configured: true, context: 'Gmail lookup failed temporarily. Do not invent email contents.' };
  }
}
