import { randomUUID } from 'node:crypto';

const prod = String(process.env.VERCEL_ENV || '').toLowerCase() === 'production';
if (!prod) {
  console.log('JARVIS_PHONE_REPAIR=skip-non-production');
  process.exit(0);
}

const sid = String(process.env.TWILIO_ACCOUNT_SID || '').trim();
const token = String(process.env.TWILIO_AUTH_TOKEN || '').trim();
const from = String(process.env.TWILIO_FROM_NUMBER || '').trim();
const to = String(process.env.OWNER_PHONE || '').trim();
const ownerName = String(process.env.OWNER_NAME || 'Tobi').trim() || 'Tobi';
const publicUrl = String(process.env.JARVIS_PUBLIC_URL || 'https://trystellarai.com').replace(/\/$/, '');
const kvUrl = String(process.env.KV_REST_API_URL || '').replace(/\/$/, '');
const kvToken = String(process.env.KV_REST_API_TOKEN || '').trim();
const e164 = /^\+[1-9]\d{7,14}$/;

if (!/^AC[a-f0-9]{32}$/i.test(sid) || !token || !e164.test(from) || !e164.test(to)) {
  console.error('JARVIS_PHONE_REPAIR=missing-or-invalid-production-phone-config');
  process.exit(2);
}
if (!to.startsWith('+44')) {
  console.error('JARVIS_PHONE_REPAIR=owner-destination-is-not-uk');
  process.exit(3);
}const auth = 'Basic ' + Buffer.from(sid + ':' + token).toString('base64');
const headers = { Authorization: auth };

async function readGb() {
  const r = await fetch('https://voice.twilio.com/v1/DialingPermissions/Countries/GB', {
    headers, signal: AbortSignal.timeout(8000),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('Twilio permission check failed (' + r.status + ').');
  return {
    low: d.low_risk_numbers_enabled === true || d.lowRiskNumbersEnabled === true,
    special: d.high_risk_special_numbers_enabled === true || d.highRiskSpecialNumbersEnabled === true,
    toll: d.high_risk_tollfraud_numbers_enabled === true || d.highRiskTollfraudNumbersEnabled === true,
  };
}

async function setGbSafe() {
  const body = new URLSearchParams({
    UpdateRequest: JSON.stringify([{
      iso_code: 'GB',
      low_risk_numbers_enabled: true,
      high_risk_special_numbers_enabled: false,
      high_risk_tollfraud_numbers_enabled: false,
    }]),
  });  const r = await fetch('https://voice.twilio.com/v1/DialingPermissions/BulkCountryUpdates', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
    body, signal: AbortSignal.timeout(10000),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('Twilio permission update failed (' + r.status + ').');
  return Number(d.update_count ?? d.updateCount ?? 0);
}

async function saveContext() {
  if (!kvUrl || !kvToken) return '';
  const id = randomUUID();
  const state = {
    purpose: 'This is your requested live Jarvis phone test. Confirm that I can reach you on your private owner number.',
    createdAt: Date.now(),
    mode: 'outbound-owner',
    ownerName,
    metadata: {
      trigger: 'one-time-owner-phone-test',
      ownerIdentity: { name: ownerName, verified: true, verifiedBy: 'one-time-production-phone-test' },
    },
    messages: [], silenceCount: 0, updatedAt: Date.now(),
  };
  const command = ['SET', 'stellar:jarvis:call:' + id, JSON.stringify(state), 'EX', 3600];  const r = await fetch(kvUrl + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + kvToken, 'Content-Type': 'application/json' },
    body: JSON.stringify([command]),
    signal: AbortSignal.timeout(8000),
  });
  return r.ok ? id : '';
}

function fallbackTwiml() {
  const safeName = ownerName.replace(/[<>&'"]/g, '');
  return '<Response><Say voice="Polly.Brian" language="en-GB"><prosody rate="102%">Hello, ' +
    safeName +
    '. Jarvis here. This is the live Stellar phone test you requested. Your private phone connection is working.</prosody></Say>' +
    '<Pause length="1"/><Say voice="Polly.Brian" language="en-GB">You can hang up now.</Say></Response>';
}

async function placeCall() {
  const contextId = await saveContext();
  const form = new URLSearchParams();
  form.set('To', to);
  form.set('From', from);
  form.set('Timeout', '25');
  if (contextId) {    form.set('Url', publicUrl + '/api/broadcast?jarvisVoice=1&context=' + encodeURIComponent(contextId));
    form.set('Method', 'POST');
    form.set('StatusCallback', publicUrl + '/api/broadcast?jarvisVoice=1&status=1&context=' + encodeURIComponent(contextId));
    form.set('StatusCallbackMethod', 'POST');
    form.append('StatusCallbackEvent', 'completed');
  } else {
    form.set('Twiml', fallbackTwiml());
  }

  const r = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + encodeURIComponent(sid) + '/Calls.json', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
    signal: AbortSignal.timeout(12000),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    const code = Number(d.code || 0);
    if (code === 13227) throw new Error('Twilio still reports Voice Geo Permission error 13227.');
    throw new Error('Twilio owner test call failed (' + r.status + (code ? '/' + code : '') + ').');
  }
  return { sid: String(d.sid || ''), status: String(d.status || 'queued') };
}async function callStatus(callSid) {
  const r = await fetch(
    'https://api.twilio.com/2010-04-01/Accounts/' + encodeURIComponent(sid) +
    '/Calls/' + encodeURIComponent(callSid) + '.json',
    { headers, signal: AbortSignal.timeout(8000) },
  );
  const d = await r.json().catch(() => ({}));
  return r.ok ? String(d.status || '') : '';
}

try {
  const before = await readGb();
  console.log('JARVIS_UK_LOW_RISK_BEFORE=' + (before.low ? 'enabled' : 'disabled'));
  if (!before.low || before.special || before.toll) {
    const updated = await setGbSafe();
    console.log('JARVIS_UK_SAFE_PERMISSION_UPDATE=' + (updated >= 1 ? 'applied' : 'submitted'));
  }

  const after = await readGb();
  if (!after.low || after.special || after.toll) {
    throw new Error('Twilio UK permission did not settle to low-risk-only.');
  }
  console.log('JARVIS_UK_LOW_RISK_AFTER=enabled');
  console.log('JARVIS_UK_HIGH_RISK_AFTER=disabled');  const call = await placeCall();
  console.log('JARVIS_REAL_CALL_CREATED=' + (call.sid ? 'yes' : 'no'));
  console.log('JARVIS_REAL_CALL_INITIAL_STATUS=' + call.status);

  const terminal = new Set(['completed', 'busy', 'failed', 'no-answer', 'canceled']);
  let status = call.status;
  for (let i = 0; call.sid && i < 12 && !terminal.has(status); i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    status = await callStatus(call.sid) || status;
  }
  console.log('JARVIS_REAL_CALL_FINAL_STATUS=' + (status || 'unknown'));
  if (['failed', 'canceled'].includes(status)) process.exit(5);
} catch (error) {
  const message = String(error?.message || error).replace(/\+[1-9]\d{7,14}/g, '[redacted destination]');
  console.error('JARVIS_PHONE_REPAIR_ERROR=' + message);
  process.exit(4);
}
