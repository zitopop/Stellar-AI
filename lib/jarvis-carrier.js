const E164 = /^\+[1-9]\d{7,14}$/;

function env(name) {
  return String(process.env[name] || '').trim();
}

function telnyxConfigured() {
  return Boolean(env('TELNYX_API_KEY')) && Boolean(env('TELNYX_CONNECTION_ID')) && E164.test(env('TELNYX_FROM_NUMBER')) && E164.test(env('OWNER_PHONE'));
}

function vapiConfigured() {
  return Boolean(env('VAPI_API_KEY')) && Boolean(env('VAPI_ASSISTANT_ID')) && Boolean(env('VAPI_PHONE_NUMBER_ID')) && E164.test(env('OWNER_PHONE'));
}

async function readJson(response) {
  return response.json().catch(() => ({}));
}

export function getAlternativeCarrierConfiguration() {
  return {
    telnyx: telnyxConfigured(),
    vapi: vapiConfigured(),
    ownerNumber: E164.test(env('OWNER_PHONE')),
  };
}

export async function startTelnyxOwnerCall(purpose) {
  if (!telnyxConfigured()) throw new Error('Telnyx owner calling is not configured.');
  const response = await fetch('https://api.telnyx.com/v2/calls', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env('TELNYX_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      connection_id: env('TELNYX_CONNECTION_ID'),
      to: env('OWNER_PHONE'),
      from: env('TELNYX_FROM_NUMBER'),
      timeout_secs: 25,
      client_state: Buffer.from(JSON.stringify({ purpose: String(purpose || '').slice(0, 300), source: 'stellar-jarvis' })).toString('base64'),
    }),
    signal: AbortSignal.timeout(12000),
  });
  const data = await readJson(response);
  if (!response.ok) {
    const error = new Error(data?.errors?.[0]?.detail || data?.errors?.[0]?.title || 'Telnyx could not start the owner call.');
    error.provider = 'telnyx';
    error.status = response.status;
    throw error;
  }
  return { ok: true, provider: 'telnyx', call_id: data?.data?.call_control_id || data?.data?.call_leg_id || null, status: 'queued' };
}

export async function startVapiOwnerCall(purpose) {
  if (!vapiConfigured()) throw new Error('Vapi owner calling is not configured.');
  const response = await fetch('https://api.vapi.ai/call/phone', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env('VAPI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      assistantId: env('VAPI_ASSISTANT_ID'),
      phoneNumberId: env('VAPI_PHONE_NUMBER_ID'),
      customer: { number: env('OWNER_PHONE') },
      assistantOverrides: {
        variableValues: {
          owner_name: env('OWNER_NAME') || 'Tobi',
          call_purpose: String(purpose || 'Jarvis needs the owner.').slice(0, 300),
        },
      },
    }),
    signal: AbortSignal.timeout(12000),
  });
  const data = await readJson(response);
  if (!response.ok) {
    const error = new Error(data?.message || data?.error || 'Vapi could not start the owner call.');
    error.provider = 'vapi';
    error.status = response.status;
    throw error;
  }
  return { ok: true, provider: 'vapi', call_id: data?.id || null, status: data?.status || 'queued' };
}

export async function startAlternativeOwnerCall(purpose) {
  const failures = [];
  for (const [configured, starter] of [
    [vapiConfigured(), startVapiOwnerCall],
    [telnyxConfigured(), startTelnyxOwnerCall],
  ]) {
    if (!configured) continue;
    try {
      return await starter(purpose);
    } catch (error) {
      failures.push(error);
      console.error(`${error?.provider || 'alternative'} owner call failed`, error?.status || '', error?.message || error);
    }
  }
  const error = new Error(failures.length ? failures.map((item) => item?.message || 'Carrier failed').join(' | ') : 'No alternative owner-call carrier is configured.');
  error.provider = failures.at(-1)?.provider || 'none';
  error.status = failures.at(-1)?.status || 503;
  throw error;
}
