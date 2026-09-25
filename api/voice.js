// api/voice.js — premium Jarvis voice output for Stellar AI
import { readSession } from '../lib/auth.js';

const OPENAI_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_TTS_API_KEY || '';
const OPENAI_BASE_URL = String(process.env.OPENAI_BASE_URL || 'https://api.openai.com').replace(/\/$/, '');
const DEFAULT_MODEL = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
const DEFAULT_VOICE = process.env.JARVIS_TTS_VOICE || process.env.OPENAI_TTS_VOICE || 'onyx';
const MAX_TEXT_CHARS = 1800;

function sendJson(res, status, payload) {
  res.status(status).setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function cleanSpeechText(value) {
  return String(value || '')
    .replace(/```[\s\S]*?```/g, 'I have code ready for you on screen.')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/https?:\/\/\S+/g, 'a link')
    .replace(/[•*_>#~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TEXT_CHARS);
}

function safeVoice(value) {
  const voice = String(value || DEFAULT_VOICE).trim().toLowerCase();
  const allowed = new Set(['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer', 'verse', 'marin', 'cedar']);
  return allowed.has(voice) ? voice : DEFAULT_VOICE;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const session = readSession(req);
  if (!session?.email) {
    return sendJson(res, 401, { error: 'Please sign in again to use premium voice.' });
  }

  if (!OPENAI_KEY) {
    return sendJson(res, 501, {
      error: 'Premium voice is not configured yet.',
      fallback: 'browser-speech',
      missing: 'OPENAI_API_KEY',
    });
  }

  const text = cleanSpeechText(req.body?.text);
  if (!text) return sendJson(res, 400, { error: 'No speech text supplied.' });

  const voice = safeVoice(req.body?.voice);
  const model = String(req.body?.model || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  const instructions = String(req.body?.instructions || 'Sound like a calm, premium British AI assistant. Confident, concise, warm, not robotic, and never over-dramatic.').slice(0, 700);

  try {
    const upstream = await fetch(`${OPENAI_BASE_URL}/v1/audio/speech`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        voice,
        input: text,
        instructions,
        response_format: 'mp3',
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      return sendJson(res, upstream.status, {
        error: 'Premium voice request failed.',
        provider: 'openai',
        status: upstream.status,
        detail: detail.slice(0, 500),
        fallback: 'browser-speech',
      });
    }

    const arrayBuffer = await upstream.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.status(200);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'audio/mpeg');
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('X-Stellar-Voice-Provider', 'openai');
    res.end(buffer);
  } catch (error) {
    return sendJson(res, 502, {
      error: 'Premium voice service is unavailable.',
      detail: error?.message || 'Unknown voice error.',
      fallback: 'browser-speech',
    });
  }
}
