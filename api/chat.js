// api/chat.js — Stellar AI
// Streams Anthropic Messages API responses with server-side plan enforcement.
import { isOwnerEmail, readSession } from './_auth.js';

const DOMAIN = 'https://trystellarai.com';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

// Keep customer-facing names separate from Anthropic API IDs.
// These IDs are valid current/legacy Claude API IDs; do not send display names upstream.
const MODELS = {
  spark: 'claude-haiku-4-5-20251001',
  star: 'claude-sonnet-4-6',
  comet: 'claude-opus-4-6',
  nova: 'claude-opus-4-8',
};

const MODEL_MAP = {
  spark: MODELS.spark,
  fabie: MODELS.spark,
  haiku: MODELS.spark,
  'claude-haiku-4-5': MODELS.spark,
  'claude-haiku-4-5-20251001': MODELS.spark,

  star: MODELS.star,
  smart: MODELS.star,
  sonnet: MODELS.star,
  'claude-sonnet-4-6': MODELS.star,

  comet: MODELS.comet,
  opus: MODELS.comet,
  'claude-opus-4-6': MODELS.comet,

  nova: MODELS.nova,
  ultra: MODELS.nova,
  'claude-opus-4-8': MODELS.nova,
};

const PLAN_LIMITS = {
  free: { requestsPerHour: 40, maxTokens: 2000, models: [MODELS.spark, MODELS.star, MODELS.comet] },
  lite: { requestsPerHour: 400, maxTokens: 5000, models: [MODELS.spark, MODELS.star, MODELS.comet] },
  plus: { requestsPerHour: 400, maxTokens: 5000, models: [MODELS.spark, MODELS.star, MODELS.comet] },
  pro: { requestsPerHour: 1600, maxTokens: 8000, models: [MODELS.spark, MODELS.star, MODELS.comet, MODELS.nova] },
  owner: { requestsPerHour: 99999, maxTokens: 8000, models: [MODELS.spark, MODELS.star, MODELS.comet, MODELS.nova] },
};

function isAllowedOrigin(origin) {
  if (!origin) return false;
  try {
    const { hostname } = new URL(origin);
    return hostname === 'trystellarai.com'
      || hostname.endsWith('.trystellarai.com')
      || hostname === 'localhost'
      || hostname === '127.0.0.1'
      || hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

function setCors(req, res) {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', isAllowedOrigin(origin) ? origin : DOMAIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
}

async function kvGet(key) {
  if (!KV_URL || !KV_TOKEN) return null;
  try {
    const response = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.result ? JSON.parse(data.result) : null;
  } catch {
    return null;
  }
}

async function kvSet(key, value, seconds) {
  if (!KV_URL || !KV_TOKEN) return;
  try {
    await fetch(`${KV_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['SET', key, JSON.stringify(value), 'EX', seconds]]),
    });
  } catch {
    // Rate limiting should not take the chat service offline if Redis is unavailable.
  }
}

async function getPlanFromServer(email) {
  if (!email) return 'free';
  const normalizedEmail = String(email).toLowerCase().trim();
  if (isOwnerEmail(normalizedEmail)) return 'owner';
  const user = await kvGet(`stellar:user:${normalizedEmail}`);
  return user && PLAN_LIMITS[user.plan] ? user.plan : 'free';
}

async function checkRate(ip, plan) {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const key = `rl:${ip}:${plan}`;
  const windowSeconds = 60 * 60;
  const record = (await kvGet(key)) || { count: 0, resetAt: Date.now() + windowSeconds * 1000 };

  if (Date.now() > record.resetAt) {
    record.count = 0;
    record.resetAt = Date.now() + windowSeconds * 1000;
  }

  record.count += 1;
  await kvSet(key, record, windowSeconds);
  return record.count <= limits.requestsPerHour;
}

function resolveModel(requestedModel, plan) {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const requested = String(requestedModel || '').trim().toLowerCase();
  const resolved = MODEL_MAP[requested] || requested;
  return limits.models.includes(resolved) ? resolved : limits.models[0];
}

function normaliseMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return null;

  const clean = messages
    .slice(-40)
    .map((message) => ({
      role: message?.role === 'assistant' ? 'assistant' : 'user',
      content: typeof message?.content === 'string' ? message.content.trim() : '',
    }))
    .filter((message) => message.content.length > 0);

  return clean.length ? clean : null;
}

function addImageToLastUserMessage(messages, image) {
  if (!image?.data || !image?.mediaType) return messages;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === 'user') {
      return messages.map((message, messageIndex) => messageIndex === index ? {
        ...message,
        content: [
          { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } },
          { type: 'text', text: message.content },
        ],
      } : message);
    }
  }

  return messages;
}

async function readAnthropicError(response) {
  try {
    const payload = await response.json();
    return payload?.error?.message || `AI request failed (${response.status})`;
  } catch {
    return `AI request failed (${response.status})`;
  }
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: 'The AI service is not configured.' });

  const { model, messages, system, max_tokens: maxTokens, image } = req.body || {};
  const cleanMessages = normaliseMessages(messages);
  if (!cleanMessages) return res.status(400).json({ error: 'Send at least one message before asking Stellar.' });
  if (JSON.stringify(cleanMessages).length > 5_000_000) {
    return res.status(400).json({ error: 'That message is too large. Send a smaller file or split it into parts.' });
  }

  const session = readSession(req);
  const plan = await getPlanFromServer(session?.email);
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (!await checkRate(ip, plan)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
  }

  const safeModel = resolveModel(model, plan);
  const requestedMaxTokens = Number(maxTokens);
  const safeMaxTokens = Number.isFinite(requestedMaxTokens)
    ? Math.max(64, Math.min(Math.floor(requestedMaxTokens), limits.maxTokens))
    : limits.maxTokens;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 95_000);
  const abortOnDisconnect = () => {
    if (!res.writableEnded) controller.abort();
  };
  res.once('close', abortOnDisconnect);

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: safeModel,
        max_tokens: safeMaxTokens,
        system: typeof system === 'string' ? system.slice(0, 120_000) : '',
        messages: addImageToLastUserMessage(cleanMessages, image),
        stream: true,
      }),
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: await readAnthropicError(upstream) });
    }

    if (!upstream.body) {
      return res.status(502).json({ error: 'The AI service returned an empty response. Please try again.' });
    }

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
      res.write(decoder.decode());
      res.end();
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    if (!res.headersSent) {
      const message = error?.name === 'AbortError'
        ? 'The AI request timed out. Please try again with a shorter request.'
        : 'Could not connect to the AI service. Please try again.';
      return res.status(502).json({ error: message });
    }
    if (!res.writableEnded) res.end();
  } finally {
    clearTimeout(timeout);
    res.removeListener('close', abortOnDisconnect);
  }
}
