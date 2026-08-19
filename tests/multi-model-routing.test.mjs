import test from 'node:test';
import assert from 'node:assert/strict';

process.env.BUILT_IN_FORGE_API_URL = 'https://forge.test';
process.env.BUILT_IN_FORGE_API_KEY = 'test-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

const { buildSystemPrompt, detectFramework, detectPlatform, detectWorkflowMode, resolveRoute, createUpstreamStream, forgeEventStream, getForgeGenerationOptions, FORGE_MODELS, PLATFORM_GUIDANCE, ROLE_OUTPUT_CONTRACTS, ROUTING_ROLES, WORKFLOW_GUIDANCE } = await import('../api/chat.js');

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

test('Task 3 detects Roblox and injects the Roblox quality gate', () => {
  const platform = detectPlatform([{ role: 'user', content: 'Build a Roblox Luau DataStore with RemoteEvent validation.' }]);
  assert.equal(platform, 'roblox');
  assert.match(buildSystemPrompt('', platform), /PLATFORM QUALITY GATE: ROBLOX/);
  assert.match(PLATFORM_GUIDANCE.roblox, /server-side/);
});

test('Task 3 detects FiveM and injects the FiveM quality gate', () => {
  const platform = detectPlatform([{ role: 'user', content: 'Create a QBCore resource with fxmanifest.lua and server events.' }]);
  assert.equal(platform, 'fivem');
  assert.match(buildSystemPrompt('', platform), /PLATFORM QUALITY GATE: FIVEM/);
  assert.match(PLATFORM_GUIDANCE.fivem, /fxmanifest/);
});

test('Task 3 keeps mixed and unknown requests explicit', () => {
  assert.equal(detectPlatform([{ role: 'user', content: 'Roblox and FiveM bridge' }]), 'mixed');
  assert.equal(detectPlatform([{ role: 'user', content: 'Make a game system' }]), 'general');
});

test('Task 4 detects Roblox Build Pack mode and injects its delivery contract', () => {
  const messages = [{ role: 'user', content: 'Build a complete Roblox game system with a DataStore and RemoteEvent.' }];
  assert.equal(detectWorkflowMode(messages), 'roblox_build_pack');
  const prompt = buildSystemPrompt('', 'roblox', 'roblox_build_pack');
  assert.match(prompt, /WORKFLOW MODE: ROBLOX BUILD PACK/);
  assert.match(prompt, /exact Studio file tree/);
  assert.equal(WORKFLOW_GUIDANCE.roblox_build_pack.includes('Never claim the place was run'), true);
});

test('Task 4 detects FiveM resource mode and injects install/test requirements', () => {
  const messages = [{ role: 'user', content: 'Make a complete QBCore resource with fxmanifest.lua.' }];
  assert.equal(detectWorkflowMode(messages), 'fivem_resource');
  const prompt = buildSystemPrompt('', 'fivem', 'fivem_resource');
  assert.match(prompt, /WORKFLOW MODE: FIVEM RESOURCE/);
  assert.match(prompt, /install\/restart steps/);
});

test('Task 4 prioritizes audit mode when a platform request asks for review', () => {
  const messages = [{ role: 'user', content: 'Audit this Roblox script for vulnerabilities and bugs.' }];
  assert.equal(detectWorkflowMode(messages), 'audit');
  assert.match(buildSystemPrompt('', 'roblox', 'audit'), /WORKFLOW MODE: CODE AUDIT/);
});

test('Task 5 detects QBCore and injects only QBCore assumptions', () => {
  const messages = [{ role: 'user', content: 'Create a FiveM QBCore resource using GetCoreObject.' }];
  assert.equal(detectFramework(messages), 'qbcore');
  assert.match(buildSystemPrompt('', 'fivem', 'fivem_resource', 'qbcore'), /FRAMEWORK CONTEXT: QBCORE/);
  assert.match(buildSystemPrompt('', 'fivem', 'fivem_resource', 'qbcore'), /do not mix ESX/);
});

test('Task 5 detects ESX, ox_lib, and standalone framework contexts', () => {
  assert.equal(detectFramework([{ role: 'user', content: 'Make a FiveM ESX job.' }]), 'esx');
  assert.equal(detectFramework([{ role: 'user', content: 'Use ox_lib for the menu in FiveM.' }]), 'ox_lib');
  assert.equal(detectFramework([{ role: 'user', content: 'Build a standalone FiveM script with no framework.' }]), 'standalone');
});

test('Task 5 refuses to choose when conflicting FiveM frameworks are named', () => {
  const messages = [{ role: 'user', content: 'Use QBCore and ESX together in this FiveM resource.' }];
  assert.equal(detectFramework(messages), 'unknown');
  assert.match(buildSystemPrompt('', 'fivem', 'fivem_resource', 'unknown'), /FRAMEWORK NOT CONFIRMED/);
});

test('Task 8 injects explicit contracts for every workspace role', () => {
  for (const role of Object.keys(ROLE_OUTPUT_CONTRACTS)) {
    const prompt = buildSystemPrompt('', 'general', 'general', 'unknown', role);
    assert.match(prompt, new RegExp(`ROLE OUTPUT CONTRACT:.*${role === 'planner' ? 'concise plan' : role === 'implementer' ? 'complete destination' : role === 'researcher' ? 'documented facts' : role === 'security' ? 'severity' : 'test matrix'}`));
  }
});

test('Task 8 keeps the stream envelope independent from role contracts', () => {
  assert.match(forgeEventStream('role-safe', 'gpt-5'), /content_block_delta/);
  assert.match(forgeEventStream('role-safe', 'gpt-5'), /role-safe/);
});

test('Task 7 uses GPT completion tokens and reasoning effort', () => {
  assert.deepEqual(getForgeGenerationOptions('gpt-5', 800), {
    max_completion_tokens: 800,
    reasoning: { effort: 'low' },
  });
});

test('Task 7 uses Claude thinking with a valid budget below max tokens', () => {
  const options = getForgeGenerationOptions('claude-sonnet-4-6', 800);
  assert.equal(options.max_tokens, 800);
  assert.deepEqual(options.thinking, { type: 'enabled', budget_tokens: 400 });
  assert.equal(options.max_tokens > options.thinking.budget_tokens, true);
});

test('Task 7 uses Gemini max_tokens and low reasoning effort', () => {
  assert.deepEqual(getForgeGenerationOptions('gemini-3-flash-preview', 800), {
    max_tokens: 800,
    reasoning_effort: 'low',
  });
});

test('Task 7 omits explicit thinking for adaptive Claude and preserves unknown fallback', () => {
  assert.deepEqual(getForgeGenerationOptions('claude-opus-4-7', 800), { max_tokens: 800 });
  assert.deepEqual(getForgeGenerationOptions('future-model', 800), { max_tokens: 800 });
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
