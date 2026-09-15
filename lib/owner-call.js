import { randomUUID } from 'node:crypto';

const BRIDGE_URL = 'https://ai-receptionist-live-chi.vercel.app/api/call-owner';
const PUBLIC_URL = String(process.env.JARVIS_PUBLIC_URL || 'https://trystellarai.com').replace(/\/$/, '');
const E164 = /^\+[1-9]\d{7,14}$/;

function twilioConfig() {
  return {
    accountSid: String(process.env.TWILIO_ACCOUNT_SID || '').trim(),
    authToken: String(process.env.TWILIO_AUTH_TOKEN || '').trim(),
    from: String(process.env.TWILIO_FROM_NUMBER || '').trim(),
    to: String(process.env.OWNER_PHONE || '').trim(),
  };
}

function hasTwilioConfig(config = twilioConfig()) {
  return /^AC[a-f0-9]{32}$/i.test(config.accountSid)
    && Boolean(config.authToken)
    && E164.test(config.from)
    && E164.test(config.to);
}

function hasCallContextStorage() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function checkCallContextStorage() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return false;
  try {
    const response = await fetch(`${url}/get/${encodeURIComponent('stellar:jarvis:health-probe')}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function ownerCallEndToEndVerified() {
  return String(process.env.OWNER_CALL_END_TO_END_VERIFIED || '').trim().toLowerCase() === 'true';
}

async function saveCallContext(purpose, metadata = {}) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('Jarvis call storage is unavailable.');
  const id = randomUUID();
  const value = JSON.stringify({ purpose, createdAt: Date.now(), mode: 'outbound-owner', metadata, ...metadata });
  const command = ['SET', `stellar:jarvis:call:${id}`, value, 'EX', 3600];
  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([command]),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('Jarvis call context could not be stored.');
  return id;
}

async function startTwilioOwnerCall(purpose, metadata = {}) {
  const config = twilioConfig();
  if (!hasTwilioConfig(config)) throw new Error('Twilio owner calling is not configured.');
  const contextId = await saveCallContext(purpose, metadata);
  const voiceUrl = `${PUBLIC_URL}/api/broadcast?jarvisVoice=1&context=${encodeURIComponent(contextId)}`;
  const form = new URLSearchParams();
  form.set('To', config.to);
  form.set('From', config.from);
  form.set('Url', voiceUrl);
  form.set('Method', 'POST');
  const statusUrl = `${PUBLIC_URL}/api/broadcast?jarvisVoice=1&status=1&context=${encodeURIComponent(contextId)}`;
  form.set('StatusCallback', statusUrl);
  form.set('StatusCallbackMethod', 'POST');
  form.append('StatusCallbackEvent', 'completed');
  form.set('Timeout', '25');

  const basic = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.accountSid)}/Calls.json`,
    {
      method: 'POST',
      headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      signal: AbortSignal.timeout(12000),
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.message || 'Twilio could not start the owner call.');
    error.provider = 'twilio';
    error.status = response.status;
    throw error;
  }
  return {
    ok: true,
    provider: 'twilio',
    call_id: data?.sid || null,
    status: data?.status || 'queued',
  };
}

async function startBridgeOwnerCall({ purpose, authorization = '', bridgeToken = '' }) {
  const headers = { 'Content-Type': 'application/json' };
  if (authorization) headers.Authorization = authorization;
  if (bridgeToken) headers['x-call-bridge-token'] = bridgeToken;
  const response = await fetch(BRIDGE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ purpose }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error || 'The existing phone bridge could not start the call.');
    error.provider = 'retell';
    error.status = response.status;
    throw error;
  }
  return {
    ok: true,
    provider: 'retell',
    call_id: data?.call_id || null,
    status: data?.status || 'started',
  };
}

export function getOwnerCallConfiguration() {
  const config = twilioConfig();
  return {
    twilioConfigured: hasTwilioConfig(config),
    ownerNumberConfigured: E164.test(config.to),
    callContextStorageConfigured: hasCallContextStorage(),
    bridgeConfigured: Boolean(process.env.CALL_BRIDGE_TOKEN),
    endToEndVerified: ownerCallEndToEndVerified(),
  };
}

export async function startOwnerCall({ purpose, authorization = '', bridgeToken = '', metadata = {} }) {
  const safePurpose = String(purpose || 'Jarvis needs the owner.').trim().slice(0, 300);
  const failures = [];

  if (hasTwilioConfig()) {
    try {
      return await startTwilioOwnerCall(safePurpose, metadata);
    } catch (error) {
      failures.push(error);
      console.error('Twilio owner call failed', error?.status || '', error?.message || error);
    }
  }

  if (bridgeToken || authorization) {
    try {
      return await startBridgeOwnerCall({ purpose: safePurpose, authorization, bridgeToken });
    } catch (error) {
      failures.push(error);
      console.error('Retell owner call failed', error?.status || '', error?.message || error);
    }
  }

  const error = new Error(
    failures.length
      ? failures.map((failure) => failure?.message || 'Phone provider failed').join(' | ')
      : 'No owner phone provider is configured.',
  );
  error.provider = failures.at(-1)?.provider || 'none';
  error.status = failures.at(-1)?.status || 503;
  throw error;
}

export async function readOwnerCallHealth({ authorization = '', bridgeToken = '' }) {
  const configuration = getOwnerCallConfiguration();
  if (configuration.twilioConfigured) {
    const storageReachable = configuration.callContextStorageConfigured
      ? await checkCallContextStorage()
      : false;
    const configured = configuration.twilioConfigured
      && configuration.ownerNumberConfigured
      && storageReachable;
    return {
      ok: true,
      ready: configured && configuration.endToEndVerified,
      configured,
      endToEndVerified: configuration.endToEndVerified,
      provider: 'twilio',
      twilio: true,
      retell: false,
      ownerNumber: configuration.ownerNumberConfigured,
      callContextStorage: storageReachable,
      callContextStorageConfigured: configuration.callContextStorageConfigured,
      agent: true,
      outboundNumber: true,
      configuredAgent: true,
      configuredNumber: true,
      error: storageReachable ? undefined : 'Call context storage is unavailable.',
    };
  }

  if (!bridgeToken && !authorization) {
    return {
      ok: true,
      ready: false,
      configured: false,
      endToEndVerified: false,
      provider: 'none',
      twilio: false,
      retell: false,
    };
  }
  const headers = { 'Content-Type': 'application/json' };
  if (authorization) headers.Authorization = authorization;
  if (bridgeToken) headers['x-call-bridge-token'] = bridgeToken;
  try {
    const response = await fetch(BRIDGE_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'health' }),
      signal: AbortSignal.timeout(12000),
    });
    const data = await response.json().catch(() => ({}));
    const configured = response.ok && data?.ready === true;
    const endToEndVerified = data?.endToEndVerified === true || configuration.endToEndVerified;
    return {
      ok: response.ok,
      ready: configured && endToEndVerified,
      configured,
      endToEndVerified,
      provider: 'retell',
      twilio: false,
      retell: data?.retell === true,
      ownerNumber: data?.ownerNumber === true,
      agent: data?.agent === true,
      outboundNumber: data?.outboundNumber === true,
      configuredAgent: data?.configuredAgent === true,
      configuredNumber: data?.configuredNumber === true,
      error: response.ok ? undefined : (data?.error || 'Phone bridge health check failed.'),
    };
  } catch (error) {
    return {
      ok: false,
      ready: false,
      configured: false,
      endToEndVerified: false,
      provider: 'retell',
      twilio: false,
      retell: false,
      error: 'Phone bridge unavailable.',
    };
  }
}
