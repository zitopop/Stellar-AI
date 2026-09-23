// api/get-chats.js — combined signed-in chat load/save endpoint
import { requireSession } from '../lib/auth.js';

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const MAX_CHATS = 15;
const MAX_MESSAGES_PER_CHAT = 30;
const MAX_MESSAGE_LENGTH = 8000;

function setCors(req, res) {
  const origin = req.headers.origin || '';
  const allowed = /^https:\/\/(?:[a-z0-9-]+\.)?trystellarai\.com$/i.test(origin)
    || /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin)
    || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : 'https://trystellarai.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Cache-Control', 'no-store');
}

function normaliseRole(role) {
  const value = String(role || '').trim().toLowerCase();
  if (value === 'assistant' || value === 'ai') return 'assistant';
  return 'user';
}

function safeTimestamp(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Date.now();
}

export function sanitizeChats(chats) {
  if (!Array.isArray(chats)) return [];
  return chats.slice(0, MAX_CHATS).map((chat) => {
    const messages = Array.isArray(chat?.messages) ? chat.messages : [];
    const cleanMessages = messages.slice(-MAX_MESSAGES_PER_CHAT).map((message) => ({
      role: normaliseRole(message?.role),
      content: typeof message?.content === 'string' ? message.content.slice(0, MAX_MESSAGE_LENGTH).trim() : '',
      t: safeTimestamp(message?.t || message?.createdAt),
    })).filter((message) => message.content);

    return {
      id: String(chat?.id || '').replace(/[^a-zA-Z0-9:_-]/g, '').slice(0, 120),
      name: String(chat?.name || chat?.title || 'New chat').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 120) || 'New chat',
      pinned: Boolean(chat?.pinned),
      updatedAt: safeTimestamp(chat?.updatedAt || cleanMessages.at(-1)?.t),
      messages: cleanMessages,
    };
  }).filter((chat) => chat.id);
}

function chatKey(email) {
  return encodeURIComponent(`stellar:chats:${String(email || '').toLowerCase().trim()}`);
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed.' });

  const session = requireSession(req, res);
  if (!session) return;
  if (!KV_URL || !KV_TOKEN) return res.status(500).json({ error: 'Account storage is not configured.' });
  const key = chatKey(session.email);

  try {
    if (req.method === 'GET') {
      const response = await fetch(`${KV_URL}/get/${key}`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` },
      });
      if (!response.ok) throw new Error('Database read failed');
      const result = (await response.json()).result;
      const chats = result ? sanitizeChats(JSON.parse(result)) : [];
      return res.status(200).json({ chats });
    }

    const { chats } = req.body || {};
    if (!Array.isArray(chats)) return res.status(400).json({ error: 'A chats array is required.' });
    const cleanChats = sanitizeChats(chats);
    const response = await fetch(`${KV_URL}/set/${key}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(JSON.stringify(cleanChats)),
    });
    if (!response.ok) throw new Error('Database write failed');
    return res.status(200).json({ ok: true, chats: cleanChats });
  } catch {
    return res.status(500).json({ error: req.method === 'GET' ? 'Could not load chats right now.' : 'Could not save chats right now.' });
  }
}
