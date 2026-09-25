import { randomUUID } from 'node:crypto';

const BRIDGE_URL = 'https://ai-receptionist-live-chi.vercel.app/api/call-owner';
const PUBLIC_URL = String(process.env.JARVIS_PUBLIC_URL || 'https://trystellarai.com').replace(/\/$/, '');
const E164 = /^\+[1-9]\d{7,14}$/;
const GENERIC_OWNER_CALL_MESSAGE = 'Jarvis from Stellar AI needs you. Please open Stellar AI to review the urgent owner alert.';

function twilioConfig() {
  return {
    accountSid: String(process.env.TWILIO_ACCOUNT_SID || '').trim(),
    authToken: String(process.env.TWILIO_AUTH_TOKEN || '').trim(),
    from: String(process.env.TWILIO_FROM_NUMBER || '').trim(),
    to: String(process.env.OWNER_PHONE || '').trim(),
  };
}

function hasAnyTwilioConfig(config = twilioConfig()) {
  return Boolean(config.accountSid || config.authToken || config.from || config.to);
}

function twilioMissing(config = twilioConfig()) {
  const missing = [];
  if (!config.accountSid) missing.push('TWILIO_ACCOUNT_SID');
  else if (!/^AC[a-f0-9]{32}$/i.test(config.accountSid)) missing.push('TWILIO_ACCOUNT_SID must start with AC and be the full Account SID');
  if (!config.authToken) missing.push('TWILIO_AUTH_TOKEN');
  if (!config.from) missing.push('TWILIO_FROM_NUMBER');
  else if (!E164.test(config.from)) missing.push('TWILIO_FROM_NUMBER must look like +16085645938');
  if (!config.to) missing.push('OWNER_PHONE');
  else if (!E164.test(config.to)) missing.push('OWNER_PHONE must look like +447123456789');
  return missing;
}

function twilioFields(config = twilioConfig()) {
  return {
    accountSid: /^AC[a-f0-9]{32}$/i.test(config.accountSid),
    authToken: Boolean(config.authToken),
    fromNumber: E164.test(config.from),
    ownerPhone: E164.test(config.to),
  };
}

function hasTwilioConfig(config = twilioConfig()) {
  return twilioMissing(config).length === 0;
}

function telnyxConfig() {
  return {
    apiKey: String(process.env.TELNYX_API_KEY || '').trim(),
    connectionId: String(process.env.TELNYX_CONNECTION_ID || '').trim(),
    from: String(process.env.TELNYX_FROM_NUMBER || process.env.JARVIS_PHONE_NUMBER || '').trim(),
    to: String(process.env.OWNER_PHONE || '').trim(),
  };
}

function hasTelnyxConfig(config = telnyxConfig()) {
  return Boolean(config.apiKey)
    && Boolean(config.connectionId)
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

function buildCallReadiness({ provider, configured, ready, endToEndVerified, missing = [], extra = {} }) {
  const needsVerification = configured && !endToEndVerified;
  const message = ready
    ? needsVerification
      ? 'Phone service is ready for owner test calls. Final verification flag is not set yet.'
      : 'Phone service is ready.'
    : missing.length
      ? `Missing: ${missing.join(' · ')}`
      : 'Phone service is not configured yet.';
  return {
    ok: true,
    ready,
    configured,
    canAttemptCall: ready,
    endToEndVerified,
    needsVerification,
    provider,
    missing,
    message,
    ...extra,
  };
}

function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function safeOwnerVoiceMessage(purpose = '') {
  const clean = String(purpose || '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);
  return clean
    ? `Jarvis from Stellar AI is calling. ${clean}`
    : GENERIC_OWNER_CALL_MESSAGE;
}

function buildTwilioFallbackTwiml(purpose = '') {
  const message = safeOwnerVoiceMessage(purpose);
  return `<Response><Say voice="alice">${escapeXml(message)}</Say><Pause length="1"/><Say voice="alice">Open Stellar AI now if you need to review it.</Say></Response>`;
}

async function saveCallContext(purpose, metadata = {}) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('Jarvis call storage is unavailable.');
  const id = randomUUID();
  const ownerName = String(process.env.OWNER_NAME || 'Tobi').trim() || 'Tobi';
  const ownerIdentity = { name: ownerName, verified: true, verifiedBy: 'outbound-owner-call' };
  const enrichedMetadata = { ...metadata, ownerIdentity };
  const value = JSON.stringify({ purpose, createdAt: Date.now(), mode: 'outbound-owner', ownerName, metadata: enrichedMetadata, ...enrichedMetadata });
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

async function optionalCallContext(purpose, metadata = {}) {
  if (!hasCallContextStorage()) return '';
  try {
    return await saveCallContext(purpose, metadata);
  } catch (error) {
    console.error('Jarvis call context unavailable; using generic owner call', error?.message || error);
    return '';
  }
}

async function startTwilioOwnerCall(purpose, metadata = {}) {
  const config = twilioConfig();
  const missing = twilioMissing(config);
  if (missing.length) {
    const error = new Error(`Twilio owner calling is not configured: ${missing.join(' · ')}`);
    error.provider = 'twilio';
    error.status = 400;
    throw error;
  }
  const contextId = await optionalCallContext(purpose, metadata);
  const form = new URLSearchParams();
  form.set('To', config.to);
  form.set('From', config.from);
  if (contextId) {
    const voiceUrl = `${PUBLIC_URL}/api/broadcast?jarvisVoice=1&context=${encodeURIComponent(contextId)}`;
    const statusUrl = `${PUBLIC_URL}/api/broadcast?jarvisVoice=1&status=1&context=${encodeURIComponent(contextId)}`;
    form.set('Url', voiceUrl);
    form.set('Method', 'POST');
    form.set('StatusCallback', statusUrl);
    form.set('StatusCallbackMethod', 'POST');
    form.append('StatusCallbackEvent', 'completed');
  } else {
    form.set('Twiml', buildTwilioFallbackTwiml(purpose));
  }
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
    generic: !contextId,
  };
}

async function startTelnyxOwnerCall(purpose, metadata = {}) {
  const config = telnyxConfig();
  if (!hasTelnyxConfig(config)) throw new Error('Telnyx Jarvis number calling is not configured.');
  const contextId = await optionalCallContext(purpose, metadata);
  const webhookUrl = contextId
    ? `${PUBLIC_URL}/api/broadcast?telnyxVoice=1&context=${encodeURIComponent(contextId)}`
    : `${PUBLIC_URL}/api/broadcast?telnyxVoice=1&genericOwnerCall=1`;
  const response = await fetch('https://api.telnyx.com/v2/calls', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ connection_id: config.connectionId, from: config.from, to: config.to, webhook_url: webhookUrl, timeout_secs: 25 }),
    signal: AbortSignal.timeout(12000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.errors?.[0]?.detail || data?.errors?.[0]?.title || data?.message || 'Telnyx could not start the owner call.');
    error.provider = 'telnyx';
    error.status = response.status;
    throw error;
  }
  return { ok: true, provider: 'telnyx', call_id: data?.data?.call_control_id || data?.data?.call_leg_id || data?.data?.call_session_id || null, status: data?.data?.state || 'queued', generic: !contextId };
}

export async function handleTelnyxVoiceWebhook(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const apiKey = String(process.env.TELNYX_API_KEY || '').trim();
  if (!apiKey) return res.status(204).end();
  const event = req.body?.data || req.body || {};
  const eventType = String(event?.event_type || event?.type || '');
  const payload = event?.payload || event;
  const callControlId = String(payload?.call_control_id || event?.call_control_id || '');
  if (eventType === 'call.answered' && callControlId) {
    const context = String(req.query?.context || '');
    let message = GENERIC_OWNER_CALL_MESSAGE;
    if (context) {
      try {
        const url = process.env.KV_REST_API_URL;
        const token = process.env.KV_REST_API_TOKEN;
        if (url && token) {
          const stored = await fetch(`${url}/get/${encodeURIComponent('stellar:jarvis:call:' + context)}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(3000) });
          const data = await stored.json().catch(() => ({}));
          const parsed = data?.result ? JSON.parse(data.result) : null;
          const purpose = String(parsed?.purpose || '').slice(0, 220);
          if (purpose) message = safeOwnerVoiceMessage(purpose);
        }
      } catch {}
    }
    await fetch(`https://api.telnyx.com/v2/calls/${encodeURIComponent(callControlId)}/actions/speak`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: message, payload_type: 'text', voice: 'female', language: 'en-US', service_level: 'basic' }),
      signal: AbortSignal.timeout(8000),
    }).catch((error) => console.error('Telnyx Jarvis speak failed', error?.message || error));
  }
  return res.status(204).end();
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
  const twilio = twilioConfig();
  const telnyx = telnyxConfig();
  const twilioMissingFields = twilioMissing(twilio);
  return {
    twilioConfigured: hasTwilioConfig(twilio),
    twilioPartiallyConfigured: hasAnyTwilioConfig(twilio),
    twilioMissing: twilioMissingFields,
    twilioFields: twilioFields(twilio),
    telnyxConfigured: hasTelnyxConfig(telnyx),
    ownerNumberConfigured: E164.test(twilio.to) || E164.test(telnyx.to),
    callContextStorageConfigured: hasCallContextStorage(),
    bridgeConfigured: Boolean(process.env.CALL_BRIDGE_TOKEN),
    endToEndVerified: ownerCallEndToEndVerified(),
  };
}

export async function startOwnerCall({ purpose, authorization = '', bridgeToken = '', metadata = {} }) {
  const safePurpose = String(purpose || 'Jarvis needs the owner.').trim().slice(0, 300);
  const failures = [];
  const twilio = twilioConfig();

  if (hasTwilioConfig(twilio)) {
    try {
      return await startTwilioOwnerCall(safePurpose, metadata);
    } catch (error) {
      failures.push(error);
      console.error('Twilio owner call failed', error?.status || '', error?.message || error);
    }
  } else if (hasAnyTwilioConfig(twilio)) {
    const missing = twilioMissing(twilio);
    const error = new Error(`Twilio config is present but not ready: ${missing.join(' · ')}`);
    error.provider = 'twilio';
    error.status = 400;
    console.error('Twilio owner call skipped', error.message);
    throw error;
  }

  if (hasTelnyxConfig()) {
    try {
      return await startTelnyxOwnerCall(safePurpose, metadata);
    } catch (error) {
      failures.push(error);
      console.error('Telnyx owner call failed', error?.status || '', error?.message || error);
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
    return buildCallReadiness({
      provider: 'twilio',
      configured: true,
      ready: true,
      endToEndVerified: configuration.endToEndVerified,
      missing: [],
      extra: {
        twilio: true,
        twilioPartiallyConfigured: configuration.twilioPartiallyConfigured,
        twilioFields: configuration.twilioFields,
        telnyx: false,
        retell: false,
        ownerNumber: configuration.ownerNumberConfigured,
        ownerNumberConfigured: configuration.ownerNumberConfigured,
        callContextStorage: storageReachable,
        callContextStorageConfigured: configuration.callContextStorageConfigured,
        callContextStorageOptional: true,
        agent: true,
        outboundNumber: true,
        configuredAgent: true,
        configuredNumber: true,
        fallbackVoice: !storageReachable,
        message: storageReachable
          ? 'Twilio owner calls are ready.'
          : 'Twilio owner calls are ready using a generic Jarvis voice message until KV storage is added.',
      },
    });
  }

  if (configuration.twilioPartiallyConfigured) {
    return buildCallReadiness({
      provider: 'twilio',
      configured: false,
      ready: false,
      endToEndVerified: false,
      missing: configuration.twilioMissing,
      extra: {
        twilio: false,
        twilioPartiallyConfigured: true,
        twilioFields: configuration.twilioFields,
        telnyx: configuration.telnyxConfigured,
        retell: configuration.bridgeConfigured,
        ownerNumber: configuration.ownerNumberConfigured,
        ownerNumberConfigured: configuration.ownerNumberConfigured,
        error: 'Twilio is present but not ready.',
        message: `Twilio is present but not ready: ${configuration.twilioMissing.join(' · ')}`,
      },
    });
  }

  if (configuration.telnyxConfigured) {
    const storageReachable = configuration.callContextStorageConfigured
      ? await checkCallContextStorage()
      : false;
    return buildCallReadiness({
      provider: 'telnyx',
      configured: true,
      ready: true,
      endToEndVerified: configuration.endToEndVerified,
      missing: [],
      extra: {
        twilio: false,
        telnyx: true,
        retell: false,
        ownerNumber: configuration.ownerNumberConfigured,
        ownerNumberConfigured: configuration.ownerNumberConfigured,
        callContextStorage: storageReachable,
        callContextStorageConfigured: configuration.callContextStorageConfigured,
        callContextStorageOptional: true,
        agent: true,
        outboundNumber: true,
        configuredAgent: true,
        configuredNumber: true,
        fallbackVoice: !storageReachable,
        message: storageReachable
          ? 'Telnyx owner calls are ready.'
          : 'Telnyx owner calls are ready using a generic Jarvis voice message until KV storage is added.',
      },
    });
  }

  if (!bridgeToken && !authorization) {
    return buildCallReadiness({
      provider: 'none',
      configured: false,
      ready: false,
      endToEndVerified: false,
      missing: ['Twilio, Telnyx or Retell bridge credentials', 'OWNER_PHONE'],
      extra: {
        twilio: false,
        telnyx: false,
        retell: false,
      },
    });
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
    const missing = [];
    if (data?.retell !== true) missing.push('Retell agent/provider');
    if (data?.ownerNumber !== true) missing.push('owner phone number');
    if (data?.outboundNumber !== true) missing.push('outbound calling number');
    if (!configured && data?.error) missing.push(data.error);
    return buildCallReadiness({
      provider: 'retell',
      configured,
      ready: configured,
      endToEndVerified,
      missing,
      extra: {
        twilio: false,
        telnyx: false,
        retell: data?.retell === true,
        ownerNumber: data?.ownerNumber === true,
        agent: data?.agent === true,
        outboundNumber: data?.outboundNumber === true,
        configuredAgent: data?.configuredAgent === true,
        configuredNumber: data?.configuredNumber === true,
        error: response.ok ? undefined : (data?.error || 'Phone bridge health check failed.'),
      },
    });
  } catch (error) {
    return buildCallReadiness({
      provider: 'retell',
      configured: false,
      ready: false,
      endToEndVerified: false,
      missing: ['phone bridge unavailable'],
      extra: {
        ok: false,
        twilio: false,
        telnyx: false,
        retell: false,
        error: 'Phone bridge unavailable.',
      },
    });
  }
}
