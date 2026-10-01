import { createHmac, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import WebSocket, { WebSocketServer } from 'ws';

const PUBLIC_URL = String(process.env.JARVIS_PUBLIC_URL || 'https://trystellarai.com').replace(/\\/$/, '');
const OPENAI_LIVE_URL = 'wss://api.openai.com/v1/live/sessions';
const OPENAI_LIVE_MODEL = String(process.env.JARVIS_LIVE_MODEL || 'gpt-live-1').trim() || 'gpt-live-1';
const OPENAI_LIVE_VOICE = String(process.env.JARVIS_LIVE_VOICE || 'marin').trim() || 'marin';
const MAX_PENDING_AUDIO_CHUNKS = 125;
const TWILIO_MEDIA_ENCODING = 'audio/x-mulaw';
const TWILIO_MEDIA_RATE = 8000;
const TWILIO_MEDIA_CHANNELS = 1;

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && timingSafeEqual(a, b);
}

function signedValue(url, authToken) {
  return createHmac('sha1', authToken).update(url).digest('base64');
}

function streamUrlCandidates(req) {
  const path = String(req.url || '/api/voice-stream').split('?')[0] || '/api/voice-stream';
  const configured = new URL(PUBLIC_URL);
  const forwardedHost = String(req.headers['x-forwarded-host'] || req.headers.host || configured.host).split(',')[0].trim();
  const hosts = new Set([configured.host, forwardedHost].filter(Boolean));
  const candidates = new Set();

  for (const host of hosts) {
    for (const protocol of ['wss:', 'https:']) {
      const base = `${protocol}//${host}${path}`;
      candidates.add(base);
      candidates.add(base.endsWith('/') ? base : `${base}/`);
    }
  }
  return [...candidates];
}

export function validateTwilioStreamRequest(req, env = process.env) {
  const authToken = String(env.TWILIO_AUTH_TOKEN || '').trim();
  const signature = String(req.headers['x-twilio-signature'] || '').trim();
  if (!authToken || !signature) return false;
  if (String(req.url || '').includes('?')) return false;
  return streamUrlCandidates(req).some((url) => safeEqual(signedValue(url, authToken), signature));
}

async function loadCallContext(contextId) {
  const id = String(contextId || '').trim().slice(0, 160);
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!id || !url || !token) return null;
  try {
    const response = await fetch(`${url}/get/${encodeURIComponent('stellar:jarvis:call:' + id)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return null;
    const data = await response.json().catch(() => ({}));
    return data?.result ? JSON.parse(data.result) : null;
  } catch {
    return null;
  }
}

function liveInstructions(context) {
  const purpose = String(context?.purpose || 'Stellar AI has an owner alert ready for review.')
    .replace(/[\\r\\n\\t]+/g, ' ')
    .replace(/\\s+/g, ' ')
    .trim()
    .slice(0, 300);
  const ownerName = String(context?.ownerName || process.env.OWNER_NAME || 'the owner').trim().slice(0, 80);
  return [
    `You are Jarvis, the private Stellar AI voice assistant speaking to ${ownerName} on a live phone call.`,
    'Use a calm, concise British technical-assistant tone. Do not imitate any real actor or copyrighted character.',
    'Keep spoken replies short: usually one or two sentences and under 45 words.',
    'Do not reveal credentials, verification codes, tokens, passwords, card data, or private secrets.',
    'Do not claim an external action completed unless the call context or a verified tool result proves it.',
    `The reason for this call is: ${purpose}`,
    'The caller has already heard the opening greeting. Listen for their request and answer directly.',
  ].join(' ');
}

function sendJson(socket, value) {
  if (socket?.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify(value));
  return true;
}

function closeSocket(socket, code = 1000, reason = '') {
  if (!socket || socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) return;
  try { socket.close(code, String(reason || '').slice(0, 120)); } catch {}
}

async function beginOpenAiBridge(twilioSocket, startMessage, pendingAudio) {
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) {
    console.error('Jarvis media stream rejected: OPENAI_API_KEY is not configured.');
    closeSocket(twilioSocket, 1011, 'Realtime voice unavailable');
    return null;
  }

  const contextId = String(startMessage?.start?.customParameters?.context || '').trim().slice(0, 160);
  const context = await loadCallContext(contextId);
  const ai = new WebSocket(OPENAI_LIVE_URL, {
    headers: { Authorization: `Bearer ${apiKey}` },
    handshakeTimeout: 8000,
    perMessageDeflate: false,
  });

  let sessionStarted = false;
  const streamSid = String(startMessage?.start?.streamSid || startMessage?.streamSid || '');

  ai.on('open', () => {
    sendJson(ai, {
      type: 'session.start',
      event_id: `stellar_${String(startMessage?.start?.callSid || 'call').slice(0, 48)}`,
      session: {
        model: OPENAI_LIVE_MODEL,
        instructions: liveInstructions(context),
        audio: {
          format: { type: 'audio/pcmu', rate: TWILIO_MEDIA_RATE },
          output: { voice: OPENAI_LIVE_VOICE },
        },
      },
    });
  });

  ai.on('message', (raw) => {
    let event;
    try { event = JSON.parse(raw.toString()); } catch { return; }

    if (event?.type === 'session.started') {
      sessionStarted = true;
      while (pendingAudio.length) {
        const audio = pendingAudio.shift();
        sendJson(ai, { type: 'session.input_audio.append', audio });
      }
      return;
    }

    if (event?.type === 'session.output_audio.delta' && typeof event.delta === 'string' && streamSid) {
      sendJson(twilioSocket, { event: 'media', streamSid, media: { payload: event.delta } });
      return;
    }

    if (event?.type === 'error') {
      console.error('Jarvis realtime voice error', String(event?.error?.message || event?.message || 'unknown error').slice(0, 240));
      closeSocket(twilioSocket, 1011, 'Realtime voice error');
    }
  });

  ai.on('error', (error) => {
    console.error('Jarvis realtime WebSocket failed', error?.message || 'unknown error');
    closeSocket(twilioSocket, 1011, 'Realtime connection failed');
  });

  ai.on('close', () => {
    if (twilioSocket.readyState === WebSocket.OPEN) closeSocket(twilioSocket, 1011, 'Realtime session ended');
  });

  return {
    socket: ai,
    append(audio) {
      if (sessionStarted && ai.readyState === WebSocket.OPEN) {
        sendJson(ai, { type: 'session.input_audio.append', audio });
        return;
      }
      if (pendingAudio.length >= MAX_PENDING_AUDIO_CHUNKS) pendingAudio.shift();
      pendingAudio.push(audio);
    },
    close() {
      if (ai.readyState === WebSocket.OPEN) {
        sendJson(ai, { type: 'session.close' });
        setTimeout(() => closeSocket(ai), 1500).unref?.();
      } else {
        closeSocket(ai);
      }
    },
  };
}

const server = createServer((req, res) => {
  res.writeHead(426, { 'Content-Type': 'text/plain; charset=utf-8', Connection: 'close' });
  res.end('WebSocket upgrade required');
});

const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 * 1024, perMessageDeflate: false });

server.on('upgrade', (req, socket, head) => {
  if (!validateTwilioStreamRequest(req)) {
    socket.write('HTTP/1.1 403 Forbidden\\r\\nConnection: close\\r\\nContent-Length: 0\\r\\n\\r\\n');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

wss.on('connection', (twilioSocket) => {
  let streamSid = '';
  let bridge = null;
  let bridgeStarting = false;
  const pendingAudio = [];

  twilioSocket.on('message', async (raw) => {
    let message;
    try { message = JSON.parse(raw.toString()); } catch { return; }

    if (message?.event === 'start') {
      if (bridge || bridgeStarting) return;
      const format = message?.start?.mediaFormat || {};
      const accountSid = String(message?.start?.accountSid || '');
      const configuredAccountSid = String(process.env.TWILIO_ACCOUNT_SID || '').trim();
      const validFormat = format.encoding === TWILIO_MEDIA_ENCODING
        && Number(format.sampleRate) === TWILIO_MEDIA_RATE
        && Number(format.channels) === TWILIO_MEDIA_CHANNELS;
      if (!validFormat || (configuredAccountSid && accountSid !== configuredAccountSid)) {
        console.error('Jarvis media stream rejected: unexpected Twilio stream metadata.');
        closeSocket(twilioSocket, 1003, 'Unsupported media stream');
        return;
      }
      streamSid = String(message?.start?.streamSid || message?.streamSid || '');
      bridgeStarting = true;
      try { bridge = await beginOpenAiBridge(twilioSocket, message, pendingAudio); }
      finally { bridgeStarting = false; }
      return;
    }

    if (message?.event === 'media' && message?.media?.track === 'inbound' && typeof message?.media?.payload === 'string') {
      if (!streamSid || message.streamSid !== streamSid) return;
      bridge?.append(message.media.payload);
      if (!bridge && bridgeStarting) {
        if (pendingAudio.length >= MAX_PENDING_AUDIO_CHUNKS) pendingAudio.shift();
        pendingAudio.push(message.media.payload);
      }
      return;
    }

    if (message?.event === 'stop') {
      bridge?.close();
      closeSocket(twilioSocket);
    }
  });

  twilioSocket.on('close', () => bridge?.close());
  twilioSocket.on('error', (error) => {
    console.error('Twilio media WebSocket error', error?.message || 'unknown error');
    bridge?.close();
  });
});

export default server;
