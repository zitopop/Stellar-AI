import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getOwnerCallConfiguration, readOwnerCallHealth, startOwnerCall } from '../lib/owner-call.js';
import { normalizePhoneNumber } from '../lib/phone-number.js';

const provider=readFileSync(new URL('../lib/owner-call.js',import.meta.url),'utf8');
const voice=readFileSync(new URL('../lib/jarvis-voice.js',import.meta.url),'utf8');
const broadcast=readFileSync(new URL('../api/broadcast.js',import.meta.url),'utf8');
const mediaStream=readFileSync(new URL('../api/voice-stream.js',import.meta.url),'utf8');

test('Jarvis can use a direct Twilio owner-call provider without exposing the owner number to clients',()=>{
  assert.match(provider,/TWILIO_ACCOUNT_SID/);
  assert.match(provider,/TWILIO_AUTH_TOKEN/);
  assert.match(provider,/TWILIO_FROM_NUMBER/);
  assert.match(provider,/OWNER_PHONE/);
  assert.match(provider,/api\.twilio\.com\/2010-04-01\/Accounts/);
  assert.match(provider,/voice\.twilio\.com\/v1\/DialingPermissions\/Countries\/GB/);
  assert.match(provider,/low_risk_numbers_enabled/);
  assert.match(provider,/DESTINATION_NOT_ALLOWED/);
  assert.match(provider,/stellar:jarvis:call:\$\{id\}/);
  assert.doesNotMatch(provider,/stellar:jarvis:call-context/);
  assert.match(provider,/checkCallContextStorage/);
  assert.match(provider,/stellar:jarvis:health-probe/);
  assert.match(provider,/callContextStorageConfigured/);
  assert.doesNotMatch(provider,/07477|0477|160856/);
});

test('direct Twilio failure keeps the existing Retell bridge as a fallback',()=>{
  assert.match(provider,/startTwilioOwnerCall/);
  assert.match(provider,/startBridgeOwnerCall/);
  assert.match(provider,/provider: 'twilio'/);
  assert.match(provider,/provider: 'retell'/);
});

test('Jarvis voice webhook validates Twilio and supports guarded two-way speech',()=>{
  assert.match(voice,/x-twilio-signature/);
  assert.match(voice,/createHmac\('sha1'/);
  assert.match(voice,/<Gather input="speech"/);
  assert.match(voice,/MAX_PUBLIC_TURNS = 12/);
  assert.match(voice,/MAX_OWNER_SILENCE_RETRIES = 5/);
  assert.match(voice,/!ownerMode && turn >= MAX_PUBLIC_TURNS/);
  assert.match(voice,/if \(ownerMode\) return sendXml\(res, gather\(reply/);
  assert.match(voice,/experimental_conversations/);
  assert.match(voice,/JARVIS_SPEECH_TIMEOUT \|\| '2'/);
  assert.match(voice,/hints=/);
  assert.match(voice,/profanityFilter="false"/);
  assert.match(voice,/Confidence/);
  assert.match(voice,/JARVIS_TWILIO_SPEECH_RATE/);
  assert.match(voice,/<prosody rate=/);
  assert.match(voice,/call-fallback-email/);
  assert.match(voice,/const from = resendSender\(\)/);
  assert.match(voice,/conversational and under 38 words/);
  assert.match(voice,/never more than once in a reply/);
  assert.match(voice,/ANTHROPIC_API_KEY/);
  assert.match(voice,/inbound-owner/);
  assert.match(voice,/inbound-public/);
  assert.match(voice,/outbound-owner/);
  assert.match(broadcast,/jarvisVoice/);
  assert.match(broadcast,/handleJarvisVoiceWebhook/);
  assert.match(provider,/api\/broadcast\?jarvisVoice=1/);
});


test('configured Twilio health check uses the validated provider config without throwing', async () => {
  const originalFetch = globalThis.fetch;
  const keys = ['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_FROM_NUMBER','OWNER_PHONE','KV_REST_API_URL','KV_REST_API_TOKEN'];
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.TWILIO_ACCOUNT_SID = 'AC' + '0'.repeat(32);
  process.env.TWILIO_AUTH_TOKEN = 'fixture-token';
  process.env.TWILIO_FROM_NUMBER = '+15005550006';
  process.env.OWNER_PHONE = '+447700900123';
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  globalThis.fetch = async (url) => {
    if (String(url).includes('voice.twilio.com/v1/DialingPermissions/Countries/GB')) {
      return Response.json({ low_risk_numbers_enabled: true });
    }
    throw new Error('Unexpected fetch: ' + url);
  };
  try {
    const health = await readOwnerCallHealth({});
    assert.equal(health.provider, 'twilio');
    assert.equal(health.ready, true);
    assert.equal(health.ownerNumberConfigured, true);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});

test('invalid Twilio credentials are not reported as ready', async () => {
  const originalFetch = globalThis.fetch;
  const keys = ['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_FROM_NUMBER','OWNER_PHONE','TELNYX_API_KEY','TELNYX_CONNECTION_ID','TELNYX_FROM_NUMBER','CALL_BRIDGE_TOKEN'];
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.TWILIO_ACCOUNT_SID = 'AC' + '0'.repeat(32);
  process.env.TWILIO_AUTH_TOKEN = 'bad-token';
  process.env.TWILIO_FROM_NUMBER = '+15005550006';
  process.env.OWNER_PHONE = '+447700900123';
  delete process.env.TELNYX_API_KEY;
  delete process.env.TELNYX_CONNECTION_ID;
  delete process.env.TELNYX_FROM_NUMBER;
  delete process.env.CALL_BRIDGE_TOKEN;
  globalThis.fetch = async (url) => {
    if (String(url).includes('voice.twilio.com/v1/DialingPermissions/Countries/GB')) {
      return Response.json({ code: 20003, message: 'Authentication Error - No credentials provided' }, { status: 401 });
    }
    throw new Error('Unexpected fetch: ' + url);
  };
  try {
    const health = await readOwnerCallHealth({});
    assert.equal(health.provider, 'twilio');
    assert.equal(health.ready, false);
    assert.equal(health.twilioBlocked, true);
    assert.equal(health.destinationPermission.httpStatus, 401);
    assert.match(health.message, /authentication is invalid/i);
    assert.deepEqual(health.missing, ['valid Twilio auth token']);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});

test('blocked UK Twilio health falls through to a ready Retell bridge', async () => {
  const originalFetch = globalThis.fetch;
  const keys = ['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_FROM_NUMBER','OWNER_PHONE','TELNYX_API_KEY','TELNYX_CONNECTION_ID','TELNYX_FROM_NUMBER'];
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.TWILIO_ACCOUNT_SID = 'AC' + '0'.repeat(32);
  process.env.TWILIO_AUTH_TOKEN = 'fixture-token';
  process.env.TWILIO_FROM_NUMBER = '+15005550006';
  process.env.OWNER_PHONE = '+447700900123';
  delete process.env.TELNYX_API_KEY;
  delete process.env.TELNYX_CONNECTION_ID;
  delete process.env.TELNYX_FROM_NUMBER;
  globalThis.fetch = async (url) => {
    if (String(url).includes('voice.twilio.com/v1/DialingPermissions/Countries/GB')) {
      return Response.json({ low_risk_numbers_enabled: false });
    }
    if (String(url).includes('/api/call-owner')) {
      return Response.json({ ready: true, retell: true, ownerNumber: true, outboundNumber: true, agent: true, configuredAgent: true, configuredNumber: true });
    }
    throw new Error('Unexpected fetch: ' + url);
  };
  try {
    const health = await readOwnerCallHealth({ bridgeToken: 'fixture' });
    assert.equal(health.ready, true);
    assert.equal(health.provider, 'retell');
    assert.equal(health.twilioBlocked, true);
    assert.equal(health.fallbackFrom, 'twilio');
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});

test('partial Twilio config does not block the Retell bridge fallback', async () => {
  const originalFetch = globalThis.fetch;
  const keys = ['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_FROM_NUMBER','OWNER_PHONE','TELNYX_API_KEY','TELNYX_CONNECTION_ID','TELNYX_FROM_NUMBER'];
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.TWILIO_ACCOUNT_SID = 'not-a-valid-account-sid';
  delete process.env.TWILIO_AUTH_TOKEN;
  delete process.env.TWILIO_FROM_NUMBER;
  delete process.env.OWNER_PHONE;
  delete process.env.TELNYX_API_KEY;
  delete process.env.TELNYX_CONNECTION_ID;
  delete process.env.TELNYX_FROM_NUMBER;
  globalThis.fetch = async (url) => {
    if (String(url).includes('/api/call-owner')) return Response.json({ ready: true, retell: true, ownerNumber: true, outboundNumber: true, agent: true, configuredAgent: true, configuredNumber: true, call_id: 'call_fixture', status: 'started' });
    throw new Error('Unexpected fetch: ' + url);
  };
  try {
    const call = await startOwnerCall({ purpose: 'Regression test', bridgeToken: 'fixture' });
    assert.equal(call.provider, 'retell');
    assert.equal(call.call_id, 'call_fixture');
    const health = await readOwnerCallHealth({ bridgeToken: 'fixture' });
    assert.equal(health.ready, true);
    assert.equal(health.provider, 'retell');
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});


test('UK number helper normalizes local input before Twilio dialing', async () => {
  assert.equal(normalizePhoneNumber('07700 900123'), '+447700900123');
  assert.equal(normalizePhoneNumber('7700 900123', { assumeNational: true }), '+447700900123');
  assert.equal(normalizePhoneNumber('0044 7700 900123'), '+447700900123');
  assert.equal(normalizePhoneNumber('+1 (500) 555-0006'), '+15005550006');

  const originalFetch = globalThis.fetch;
  const keys = ['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_FROM_NUMBER','OWNER_PHONE','KV_REST_API_URL','KV_REST_API_TOKEN','TELNYX_API_KEY','TELNYX_CONNECTION_ID','TELNYX_FROM_NUMBER'];
  const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  let callBody = '';
  process.env.TWILIO_ACCOUNT_SID = 'AC' + '0'.repeat(32);
  process.env.TWILIO_AUTH_TOKEN = 'fixture-token';
  process.env.TWILIO_FROM_NUMBER = '+15005550006';
  process.env.OWNER_PHONE = '+447700900123';
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.TELNYX_API_KEY;
  delete process.env.TELNYX_CONNECTION_ID;
  delete process.env.TELNYX_FROM_NUMBER;
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).includes('voice.twilio.com/v1/DialingPermissions/Countries/GB')) {
      return Response.json({ low_risk_numbers_enabled: true });
    }
    if (String(url).includes('/Calls.json')) {
      callBody = String(options.body || '');
      return Response.json({ sid: 'CA' + '1'.repeat(32), status: 'queued' });
    }
    throw new Error('Unexpected fetch: ' + url);
  };
  try {
    const call = await startOwnerCall({ purpose: 'E.164 regression test' });
    assert.equal(call.provider, 'twilio');
    const params = new URLSearchParams(callBody);
    assert.equal(params.get('To'), '+447700900123');
    assert.equal(params.get('From'), '+15005550006');
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});

test('outbound owner calls use a bidirectional 8 kHz mu-law media bridge when realtime voice is configured', () => {
  assert.match(voice, /<Connect><Stream/);
  assert.match(voice, /\/api\/voice-stream/);
  assert.match(mediaStream, /audio\/x-mulaw/);
  assert.match(mediaStream, /TWILIO_MEDIA_RATE = 8000/);
  assert.match(mediaStream, /audio\/pcmu/);
  assert.match(mediaStream, /session\.input_audio\.append/);
  assert.match(mediaStream, /session\.output_audio\.delta/);
  assert.match(mediaStream, /x-twilio-signature/);
  assert.match(mediaStream, /timingSafeEqual/);
});

test('internal owner escalation auth no longer requires the Retell bridge token', () => {
  const escalation=readFileSync(new URL('../lib/owner-escalation.js',import.meta.url),'utf8');
  assert.match(escalation, /OWNER_INTERNAL_TOKEN/);
  assert.match(escalation, /CRON_SECRET/);
  assert.match(escalation, /x-owner-internal-token/);
  assert.match(broadcast, /x-owner-internal-token/);
});


test('Twilio accepts TWILIO_PHONE_NUMBER as an outbound-number alias and exposes strict E.164 health flags', async () => {
  const originalFetch = globalThis.fetch;
  const keys = ['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_FROM_NUMBER','TWILIO_PHONE_NUMBER','OWNER_PHONE','KV_REST_API_URL','KV_REST_API_TOKEN','TELNYX_API_KEY','TELNYX_CONNECTION_ID','TELNYX_FROM_NUMBER','CALL_BRIDGE_TOKEN'];
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.TWILIO_ACCOUNT_SID = 'AC' + '0'.repeat(32);
  process.env.TWILIO_AUTH_TOKEN = 'fixture-token';
  delete process.env.TWILIO_FROM_NUMBER;
  process.env.TWILIO_PHONE_NUMBER = '+15005550006';
  process.env.OWNER_PHONE = '+447700900123';
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.TELNYX_API_KEY;
  delete process.env.TELNYX_CONNECTION_ID;
  delete process.env.TELNYX_FROM_NUMBER;
  delete process.env.CALL_BRIDGE_TOKEN;
  globalThis.fetch = async (url) => {
    if (String(url).includes('voice.twilio.com/v1/DialingPermissions/Countries/GB')) {
      return Response.json({ low_risk_numbers_enabled: true });
    }
    throw new Error('Unexpected fetch: ' + url);
  };
  try {
    const config = getOwnerCallConfiguration();
    assert.equal(config.twilioConfigured, true);
    assert.equal(config.twilioFields.fromVariable, 'TWILIO_PHONE_NUMBER');
    assert.equal(config.twilioFields.rawFromE164, true);
    assert.equal(config.twilioFields.rawOwnerPhoneE164, true);
    const health = await readOwnerCallHealth({});
    assert.equal(health.ready, true);
    assert.equal(health.twilioFields.fromVariable, 'TWILIO_PHONE_NUMBER');
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});

test('Twilio accepts formatted phone numbers after normalization', () => {
  const keys = ['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_FROM_NUMBER','TWILIO_PHONE_NUMBER','OWNER_PHONE'];
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.TWILIO_ACCOUNT_SID = 'AC' + '0'.repeat(32);
  process.env.TWILIO_AUTH_TOKEN = 'fixture-token';
  process.env.TWILIO_FROM_NUMBER = '+1 (500) 555-0006';
  delete process.env.TWILIO_PHONE_NUMBER;
  process.env.OWNER_PHONE = '07700 900123';
  try {
    const config = getOwnerCallConfiguration();
    assert.equal(config.twilioConfigured, true);
    assert.equal(config.twilioFields.fromNumber, true);
    assert.equal(config.twilioFields.ownerPhone, true);
    assert.equal(config.twilioFields.rawFromE164, false);
    assert.equal(config.twilioFields.rawOwnerPhoneE164, false);
    assert.doesNotMatch(config.twilioMissing.join(' '), /OWNER_PHONE|outbound number/i);
  } finally {
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});

test('Twilio API error code and HTTP status survive the owner-call fallback layer', async () => {
  const originalFetch = globalThis.fetch;
  const keys = ['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_FROM_NUMBER','TWILIO_PHONE_NUMBER','OWNER_PHONE','KV_REST_API_URL','KV_REST_API_TOKEN','TELNYX_API_KEY','TELNYX_CONNECTION_ID','TELNYX_FROM_NUMBER','CALL_BRIDGE_TOKEN'];
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.TWILIO_ACCOUNT_SID = 'AC' + '0'.repeat(32);
  process.env.TWILIO_AUTH_TOKEN = 'fixture-token';
  process.env.TWILIO_FROM_NUMBER = '+15005550006';
  delete process.env.TWILIO_PHONE_NUMBER;
  process.env.OWNER_PHONE = '+447700900123';
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.TELNYX_API_KEY;
  delete process.env.TELNYX_CONNECTION_ID;
  delete process.env.TELNYX_FROM_NUMBER;
  delete process.env.CALL_BRIDGE_TOKEN;

  globalThis.fetch = async (url) => {
    if (String(url).includes('voice.twilio.com/v1/DialingPermissions/Countries/GB')) {
      return Response.json({ low_risk_numbers_enabled: true });
    }
    if (String(url).includes('/Calls.json')) {
      return Response.json({
        code: 21210,
        message: "'From' phone number not verified",
        more_info: 'https://www.twilio.com/docs/api/errors/21210',
        status: 400,
      }, { status: 400 });
    }
    throw new Error('Unexpected fetch: ' + url);
  };

  try {
    await assert.rejects(
      () => startOwnerCall({ purpose: 'Twilio error propagation fixture' }),
      (error) => {
        assert.equal(error.provider, 'twilio');
        assert.equal(error.status, 400);
        assert.equal(error.code, 21210);
        assert.equal(error.twilio?.code, 21210);
        assert.equal(error.twilio?.moreInfo, 'https://www.twilio.com/docs/api/errors/21210');
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});

test('owner-call source logs sanitized Twilio REST and terminal callback diagnostics', () => {
  assert.match(provider, /Twilio Calls API rejected owner call/);
  assert.match(provider, /Twilio owner call skipped before API submission/);
  assert.match(provider, /moreInfo/);
  assert.match(voice, /Twilio owner call terminal failure/);
  assert.match(voice, /ErrorCode/);
  assert.match(broadcast, /code: error\?\.code/);
});
