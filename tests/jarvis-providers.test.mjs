import test from 'node:test';
import assert from 'node:assert/strict';
import { capabilities, research, generate, notifyOwner } from '../lib/jarvis-providers.js';

test('provider results remain grounded, bounded and owner notifications narrowly addressed', async () => {
  const originalFetch = globalThis.fetch;
  const names = ['ANTHROPIC_API_KEY','BRAVE_SEARCH_API_KEY','RESEND_API_KEY','RESEND_FROM_EMAIL','CRON_SECRET'];
  const original = Object.fromEntries(names.map(name => [name, process.env[name]]));
  Object.assign(process.env, { ANTHROPIC_API_KEY: 'fixture', BRAVE_SEARCH_API_KEY: 'fixture', RESEND_API_KEY: 'fixture', RESEND_FROM_EMAIL: 'Jarvis <no-reply@example.com>' });
  const requests = [];
  try {
    globalThis.fetch = async (url, options) => {
      requests.push({ url, options });
      if (String(url).includes('brave.com')) return Response.json({ web: { results: [{ title: '<b>Source</b>', url: 'https://docs.example.com', description: 'Evidence' }, { title: 'Unsafe', url: 'javascript:alert(1)' }] } });
      if (String(url).includes('anthropic.com')) return Response.json({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Evidence-based result' }], usage: { input_tokens: 23, output_tokens: 7 } });
      return Response.json({ id: 'fixture-email' });
    };
    assert.equal(capabilities().ai, true);
    const sources = await research('Product documentation');
    assert.equal(sources.length, 1); assert.equal(sources[0].title, 'Source');
    const result = await generate({ role: 'customers', objective: 'Find opportunities', sources });
    assert.equal(result.text, 'Evidence-based result'); assert.equal(result.usage.inputTokens, 23);
    const call = JSON.parse(requests.at(-1).options.body); assert.equal(call.max_tokens, 2500); assert.ok(call.system.includes('untrusted evidence'));
    const denied = await notifyOwner({ channel: 'email', ownerEmail: 'stranger@example.com', mission: { id: 'test', status: 'completed' } });
    assert.equal(denied.status, 'failed'); assert.equal(requests.length, 2);
    const accepted = await notifyOwner({ channel: 'email', ownerEmail: 'tobi@trystellarai.com', mission: { id: 'test', status: 'completed', title: 'Draft complete' } });
    assert.equal(accepted.status, 'accepted');
    assert.deepEqual(JSON.parse(requests.at(-1).options.body).to, ['tobi@trystellarai.com']);
    assert.ok(requests.at(-1).options.headers['Idempotency-Key']);
    globalThis.fetch = async () => Response.json({ stop_reason: 'max_tokens', content: [{ type: 'text', text: 'unfinished' }] });
    await assert.rejects(generate({ role: 'products', objective: 'Build product' }), /output limit/);
    globalThis.fetch = async () => Response.json({ error: 'sensitive upstream diagnostics' }, { status: 401 });
    await assert.rejects(research('Find sources'), error => !error.message.includes('sensitive'));
  } finally { globalThis.fetch = originalFetch; for (const name of names) { if (original[name] === undefined) delete process.env[name]; else process.env[name] = original[name]; } }
});
