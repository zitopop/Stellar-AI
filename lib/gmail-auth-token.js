import { readPluginCredential } from './plugin-credentials.js';

function gmailClientId() {
  return String(process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID || '').trim();
}
function gmailClientSecret() {
  return String(process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET || '').trim();
}
function gmailOwnerEmail() {
  return String(process.env.GMAIL_WATCH_EMAIL || process.env.OWNER_EMAIL || String(process.env.OWNER_EMAILS || '').split(',')[0] || '').trim().toLowerCase();
}
export function gmailOAuthConfigured() {
  return Boolean(gmailClientId() && (process.env.GMAIL_REFRESH_TOKEN || gmailOwnerEmail()));
}
export async function getGmailRefreshToken() {
  const envToken = String(process.env.GMAIL_REFRESH_TOKEN || '').trim();
  if (envToken) return envToken;
  const ownerEmail = gmailOwnerEmail();
  if (!ownerEmail) return '';
  try { return String(await readPluginCredential(ownerEmail, 'gmail') || '').trim(); }
  catch { return ''; }
}
export async function getGmailAccessToken() {
  const clientId = gmailClientId();
  const refreshToken = await getGmailRefreshToken();
  if (!clientId || !refreshToken) return '';
  const body = new URLSearchParams({ client_id: clientId, refresh_token: refreshToken, grant_type: 'refresh_token' });
  const secret = gmailClientSecret();
  if (secret) body.set('client_secret', secret);
  const response = await fetch('https://oauth2.googleapis.com/token', { method:'POST', headers:{ 'Content-Type':'application/x-www-form-urlencoded' }, body, signal: AbortSignal.timeout(7000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.access_token) throw new Error(data?.error_description || 'Gmail token refresh failed');
  return String(data.access_token);
}
