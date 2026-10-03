// lib/api-keys.js — one customer-managed Stellar integration key per account.
import crypto from 'node:crypto';
import { kvGet, kvPipeline } from './profile.js';

const API_KEY_ID_PATTERN = /^[A-Za-z0-9_-]{12}$/;
const API_KEY_PATTERN = /^sk-stellar_([A-Za-z0-9_-]{12})_([A-Za-z0-9_-]{32})$/;

function sha256(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function pointerKey(email) {
  return 'stellar:api-key-user:' + sha256(String(email || '').trim().toLowerCase()).slice(0, 32);
}

function recordKey(id) {
  return 'stellar:api-key-id:' + String(id || '');
}

function safeEqualHex(left, right) {
  const a = Buffer.from(String(left || ''), 'hex');
  const b = Buffer.from(String(right || ''), 'hex');
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

function maskFromPointer(pointer) {
  if (!pointer?.id || !pointer?.last4) return '';
  return `sk-stellar_${pointer.id}_••••••••••••••••••••••••••••${pointer.last4}`;
}

export async function readApiKeySummary(url, token, email) {
  const pointer = await kvGet(url, token, pointerKey(email));
  if (!pointer || !API_KEY_ID_PATTERN.test(String(pointer.id || ''))) {
    return { exists: false, masked: '', createdAt: null };
  }
  return {
    exists: true,
    masked: maskFromPointer(pointer),
    createdAt: Number(pointer.createdAt) || null,
    id: String(pointer.id),
  };
}

export async function regenerateApiKey(url, token, email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) throw new Error('A signed-in account is required.');

  const oldPointer = await kvGet(url, token, pointerKey(normalizedEmail));
  const id = crypto.randomBytes(9).toString('base64url').slice(0, 12);
  const secret = crypto.randomBytes(24).toString('base64url');
  const key = `sk-stellar_${id}_${secret}`;
  const createdAt = Date.now();
  const pointer = { id, last4: key.slice(-4), createdAt };
  const record = { email: normalizedEmail, hash: sha256(key), createdAt, scope: 'integrations' };
  const commands = [];

  if (API_KEY_ID_PATTERN.test(String(oldPointer?.id || ''))) {
    commands.push(['DEL', recordKey(oldPointer.id)]);
  }
  commands.push(
    ['SET', recordKey(id), JSON.stringify(record)],
    ['SET', pointerKey(normalizedEmail), JSON.stringify(pointer)],
  );
  await kvPipeline(url, token, commands);

  return {
    key,
    summary: {
      exists: true,
      masked: maskFromPointer(pointer),
      createdAt,
      id,
    },
  };
}

export async function verifyStellarApiKey(url, token, rawKey) {
  const match = String(rawKey || '').trim().match(API_KEY_PATTERN);
  if (!match) return null;
  const id = match[1];
  const record = await kvGet(url, token, recordKey(id));
  if (!record?.email || !safeEqualHex(record.hash, sha256(rawKey))) return null;
  return { email: String(record.email).trim().toLowerCase(), id, scope: String(record.scope || 'integrations') };
}

export { API_KEY_PATTERN, maskFromPointer, pointerKey, recordKey, safeEqualHex };
