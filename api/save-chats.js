// api/save-chats.js — saves the signed-in user's conversation list
import { requireSession } from '../lib/auth.js';

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

function setCors(req, res) {
  const origin = req.headers.origin || '';
  const allowed = /^https:\/\/(?:[a-z0-9-]+\.)?trystellarai\.com$/i.test(origin)
    || /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin)
    || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : 'https://trystellarai.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
}

function sanitizeChats(chats) {
  return chats.slice(0, 15).map((chat) => ({
    id: String(chat?.id || '').slice(0, 120),
    name: String(chat?.name || 'New chat').slice(0, 120),
    pinned: Boolean(chat?.pinned),
    messages: Array.isArray(chat?.messages) ? chat.messages.slice(-30).map((message) => ({
      role: message?.role === 'ai' ? 'ai' : 'user',
      content: typeof message?.content === 'string' ? message.content.slice(0, 8000) : '',
      t: Number(message?.t) || Date.now(),
    })).filter((message) => message.content) : [],
  })).filter((chat) => chat.id);
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const session = requireSession(req, res);
  if (!session) return;
  const { chats } = req.body || {};
  if (!Array.isArray(chats)) return res.status(400).json({ error: 'A chats array is required.' });
  if (!KV_URL || !KV_TOKEN) return res.status(500).json({ error: 'Account storage is not configured.' });

  try {
    const response = await fetch(`${KV_URL}/set/${encodeURIComponent(`stellar:chats:${session.email}`)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(JSON.stringify(sanitizeChats(chats))),
    });
    if (!response.ok) throw new Error('Database write failed');
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(500).json({ error: 'Could not save chats right now.' });
  }
}
