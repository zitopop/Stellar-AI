const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

function configured() {
  return Boolean(
    process.env.GMAIL_CLIENT_ID &&
    process.env.GMAIL_CLIENT_SECRET &&
    process.env.GMAIL_REFRESH_TOKEN
  );
}

async function getAccessToken() {
  if (!configured()) return '';
  const body = new URLSearchParams({
    client_id: String(process.env.GMAIL_CLIENT_ID),
    client_secret: String(process.env.GMAIL_CLIENT_SECRET),
    refresh_token: String(process.env.GMAIL_REFRESH_TOKEN),
    grant_type: 'refresh_token',
  });
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

export async function getOwnerEmailContext(speech) {
  if (!looksLikeEmailRequest(speech)) return { requested: false, configured: configured(), context: '' };
  if (!configured()) return { requested: true, configured: false, context: '' };

  try {
    const token = await getAccessToken();
    const query = safeQuery(speech);
    const list = await gmailFetch(`/messages?q=${encodeURIComponent(query)}&maxResults=5`, token);
    const ids = (list?.messages || []).slice(0, 5).map((item) => item?.id).filter(Boolean);
    if (!ids.length) return { requested: true, configured: true, context: 'No matching email was found.' };

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

    const context = messages.map((message, index) => [
      `EMAIL ${index + 1}`,
      `From: ${message.from || 'Unknown'}`,
      `Subject: ${message.subject || '(no subject)'}`,
      `Date: ${message.date || 'Unknown'}`,
      `Body: ${message.body || '(no readable body)'}`,
    ].join('\n')).join('\n\n').slice(0, 7000);

    return { requested: true, configured: true, context };
  } catch (error) {
    console.error('Owner Gmail lookup failed', error?.message || error);
    return { requested: true, configured: true, context: 'Gmail lookup failed temporarily. Do not invent email contents.' };
  }
}
