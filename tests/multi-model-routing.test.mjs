import test from 'node:test';
import assert from 'node:assert/strict';

process.env.BUILT_IN_FORGE_API_URL = 'https://forge.test';
process.env.BUILT_IN_FORGE_API_KEY = 'test-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

const { resolveRoute, createUpstreamStream, forgeEventStream, FORGE_MODELS, ROUTING_ROLES } = await import('../api/chat.js');

test('Task 1 exposes the approved specialist role contract', () => {
  assert.deepEqual(Object.keys(ROUTING_ROLES).sort(), ['implementer', 'planner', 'researcher', 'security', 'tester']);
  assert.equal(FORGE_MODELS.has('gpt-5-mini'), true);
  assert.equal(FORGE_MODELS.has('gemini-3-flash-preview'), true);
});

test('Task 1 routes research role to the built-in multi-AI provider', () => {
  const route = resolveRoute('smart', 'researcher', 'lite');
  assert.deepEqual(route, {
    provider: 'forge',
    model: 'gemini-3-flash-preview',
    role: 'researcher',
    fallbackTier: 'star',
    instruction: ROUTING_ROLES.researcher.instruction,
  });
});

test('Task 1 protects premium security routing on non-Pro plans', () => {
  const route = resolveRoute('smart', 'security', 'lite');
  assert.equal(route.provider, 'anthropic');
  assert.equal(route.tier, 'star');
  assert.equal(route.role, 'security');
});

test('Task 1 routes premium security role to GPT on Pro', () => {
  const route = resolveRoute('smart', 'security', 'pro');
  assert.equal(route.provider, 'forge');
  assert.equal(route.model, 'gpt-5');
  assert.equal(route.role, 'security');
});

test('Task 1 emits the existing Anthropic-compatible stream framing', () => {
  const stream = forgeEventStream('hello', 'gpt-5-mini');
  assert.match(stream, /data: .*content_block_delta/);
  assert.match(stream, /"text":"hello"/);
  assert.match(stream, /data: \[DONE\]\n\n$/);
});

test('Task 2 falls back once when the built-in provider is unavailable', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).includes('/v1/chat/completions')) return new Response('temporary provider outage', { status: 503 });
    return new Response('data: {"type":"content_block_delta","delta":{"text":"fallback"}}\\n\\ndata: [DONE]\\n\\n', {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    });
  };

  try {
    const response = await createUpstreamStream({
      route: { provider: 'forge', model: 'gpt-5-mini', fallbackTier: 'star' },
      maxTokens: 256,
      system: 'test',
      messages: [{ role: 'user', content: 'test' }],
      signal: undefined,
    });
    assert.equal(response.status, 200);
    assert.deepEqual(calls, ['https://forge.test/v1/chat/completions', 'https://api.anthropic.com/v1/messages']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
