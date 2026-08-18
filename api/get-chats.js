// api/get-chats.js — loads the signed-in user's conversation list
import { requireSession } from '../lib/auth.js';

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

function setCors(req, res) {
  const origin = req.headers.origin || '';
  const allowed = /^https:\/\/(?:[a-z0-9-]+\.)?trystellarai\.com$/i.test(origin)
    || /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin)
    || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : 'https://trystellarai.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');
  res.setHeader('Vary', 'Origin');
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const session = requireSession(req, res);
  if (!session) return;
  if (!KV_URL || !KV_TOKEN) return res.status(500).json({ error: 'Account storage is not configured.' });

  try {
    const response = await fetch(`${KV_URL}/get/${encodeURIComponent(`stellar:chats:${session.email}`)}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
    });
    if (!response.ok) throw new Error('Database read failed');
    const result = (await response.json()).result;
    const chats = result ? JSON.parse(result) : [];
    return res.status(200).json({ chats: Array.isArray(chats) ? chats : [] });
  } catch {
    return res.status(500).json({ error: 'Could not load chats right now.' });
  }
}
