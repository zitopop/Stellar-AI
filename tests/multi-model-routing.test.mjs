import test from 'node:test';
import assert from 'node:assert/strict';

process.env.BUILT_IN_FORGE_API_URL = 'https://forge.test';
process.env.BUILT_IN_FORGE_API_KEY = 'test-key';

const { resolveRoute, forgeEventStream, FORGE_MODELS, ROUTING_ROLES } = await import('../api/chat.js');

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
