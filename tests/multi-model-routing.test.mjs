import test from 'node:test';
import assert from 'node:assert/strict';

process.env.BUILT_IN_FORGE_API_URL = 'https://forge.test';
process.env.BUILT_IN_FORGE_API_KEY = 'test-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

const { buildSystemPrompt, detectFramework, detectPlatform, detectWorkflowMode, resolveRoute, createUpstreamStream, forgeEventStream, getForgeGenerationOptions, FORGE_MODELS, PLATFORM_GUIDANCE, ROLE_OUTPUT_CONTRACTS, ROLE_RESPONSE_SCHEMAS, ROUTING_ROLES, WORKFLOW_GUIDANCE } = await import('../api/chat.js');

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

test('Task 14 forwards every role schema to Forge and preserves the stream response', async () => {
  const originalFetch = globalThis.fetch;
  const bodies = [];
  globalThis.fetch = async (_url, options) => {
    bodies.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ choices: [{ message: { content: 'schema-ok' } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    for (const role of Object.keys(ROLE_RESPONSE_SCHEMAS)) {
      const response = await createUpstreamStream({
        route: { provider: 'forge', model: 'gpt-5-mini' },
        maxTokens: 256,
        system: 'test',
        messages: [{ role: 'user', content: 'test' }],
        responseFormat: ROLE_RESPONSE_SCHEMAS[role],
        signal: undefined,
      });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('content-type').includes('text/event-stream'), true);
    }
    assert.deepEqual(bodies.map((body) => body.response_format), Object.values(ROLE_RESPONSE_SCHEMAS));
  } finally {
    globalThis.fetch = originalFetch;
  }
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

test('Task 17 explains structured-output limits during fallback', () => {
  const prompt = buildSystemPrompt('', 'roblox', 'roblox_build_pack', 'unknown', 'planner');
  assert.match(prompt, /STRUCTURED OUTPUT FALLBACK/);
  assert.match(prompt, /JSON Schema transport is unavailable/);
  assert.match(prompt, /do not claim that schema validation or execution occurred/);
});

test('Task 16 keeps mixed-platform APIs, files, dependencies, and tests isolated', () => {
  const prompt = buildSystemPrompt('', 'mixed', 'general', 'unknown', 'implementer');
  assert.match(prompt, /Separate Roblox Luau and FiveM Lua conventions/);
  assert.match(prompt, /State which files belong to each platform/);
  assert.match(prompt, /name platform-specific dependencies/);
  assert.match(prompt, /independent test matrices/);
  assert.equal(detectFramework([{ role: 'user', content: 'Roblox and FiveM with QBCore and ESX' }], 'mixed'), 'unknown');
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

test('Task 13 exposes a strict implementer JSON Schema contract', () => {
  const implementer = ROLE_RESPONSE_SCHEMAS.implementer.json_schema;
  assert.equal(implementer.strict, true);
  assert.deepEqual(implementer.schema.required, ['summary', 'files', 'setup_steps', 'validation_checks', 'execution_status']);
  assert.deepEqual(implementer.schema.properties.files.items.required, ['path', 'content', 'purpose', 'complete']);
  assert.equal(implementer.schema.properties.files.items.additionalProperties, false);
  assert.deepEqual(implementer.schema.properties.execution_status.enum, ['not_run', 'not_verified']);
});

test('Task 12 exposes a strict researcher JSON Schema contract', () => {
  const researcher = ROLE_RESPONSE_SCHEMAS.researcher.json_schema;
  assert.equal(researcher.strict, true);
  assert.deepEqual(researcher.schema.required, ['summary', 'facts', 'assumptions', 'open_questions']);
  assert.equal(researcher.schema.properties.facts.items.additionalProperties, false);
  assert.deepEqual(researcher.schema.properties.facts.items.required, ['claim', 'source_label', 'source_url', 'supports']);
});

test('Task 11 exposes strict planner and tester JSON Schema contracts', () => {
  const planner = ROLE_RESPONSE_SCHEMAS.planner.json_schema;
  assert.equal(planner.strict, true);
  assert.deepEqual(planner.schema.required, ['summary', 'assumptions', 'files', 'dependencies', 'acceptance_checks']);
  assert.equal(planner.schema.properties.files.items.additionalProperties, false);
  assert.deepEqual(planner.schema.properties.files.items.required, ['path', 'purpose']);

  const tester = ROLE_RESPONSE_SCHEMAS.tester.json_schema;
  assert.equal(tester.strict, true);
  assert.deepEqual(tester.schema.required, ['summary', 'cases', 'evidence_limits']);
  assert.equal(tester.schema.properties.cases.items.additionalProperties, false);
  assert.deepEqual(tester.schema.properties.cases.items.required, ['name', 'setup', 'input', 'expected', 'failure_path']);
});

test('Task 10 exposes a strict security JSON Schema contract', () => {
  const schema = ROLE_RESPONSE_SCHEMAS.security;
  assert.equal(schema.type, 'json_schema');
  assert.equal(schema.json_schema.strict, true);
  assert.deepEqual(schema.json_schema.schema.required, ['summary', 'findings', 'evidence_limits']);
  assert.equal(schema.json_schema.schema.additionalProperties, false);
  assert.deepEqual(schema.json_schema.schema.properties.findings.items.required, ['severity', 'boundary', 'abuse_path', 'fix', 'residual_risk']);
  assert.equal(schema.json_schema.schema.properties.findings.items.additionalProperties, false);
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

test('Task 15 preserves role, platform, workflow, and framework guidance during fallback', () => {
  const prompt = buildSystemPrompt('', 'fivem', 'fivem_resource', 'qbcore', 'security');
  assert.match(prompt, /PLATFORM QUALITY GATE: FIVEM/);
  assert.match(prompt, /FRAMEWORK CONTEXT: QBCORE/);
  assert.match(prompt, /WORKFLOW MODE: FIVEM RESOURCE/);
  assert.match(prompt, /ROLE OUTPUT CONTRACT:.*severity/);
});

test('Task 18 falls back once when Forge fetch throws a network error', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).includes('/v1/chat/completions')) throw new Error('socket closed');
    return new Response('data: {"type":"content_block_delta","delta":{"text":"network fallback"}}\\n\\ndata: [DONE]\\n\\n', {
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

test('Task 19 propagates AbortError without starting a fallback request', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  const abortError = Object.assign(new Error('request aborted'), { name: 'AbortError' });
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    throw abortError;
  };
  try {
    await assert.rejects(
      createUpstreamStream({
        route: { provider: 'forge', model: 'gpt-5-mini', fallbackTier: 'star' },
        maxTokens: 256,
        system: 'test',
        messages: [{ role: 'user', content: 'test' }],
        signal: undefined,
      }),
      (error) => error === abortError,
    );
    assert.deepEqual(calls, ['https://forge.test/v1/chat/completions']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Task 20 falls back once when Forge returns malformed JSON', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).includes('/v1/chat/completions')) return new Response('{not-json', { status: 200 });
    return new Response('data: {"type":"content_block_delta","delta":{"text":"malformed fallback"}}\\n\\ndata: [DONE]\\n\\n', {
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

test('Task 21 tries the next Anthropic candidate after a network error', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), model: JSON.parse(options.body).model });
    if (calls.length === 1) throw new Error('socket closed');
    return new Response('data: {"type":"content_block_delta","delta":{"text":"anthropic retry"}}\\n\\ndata: [DONE]\\n\\n', {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    });
  };
  try {
    const response = await createUpstreamStream({
      route: { provider: 'anthropic', tier: 'star' },
      maxTokens: 256,
      system: 'test',
      messages: [{ role: 'user', content: 'test' }],
      signal: undefined,
    });
    assert.equal(response.status, 200);
    assert.deepEqual(calls.map(({ url }) => url), [
      'https://api.anthropic.com/v1/messages',
      'https://api.anthropic.com/v1/messages',
    ]);
    assert.notEqual(calls[0].model, calls[1].model);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Task 22 propagates direct Anthropic AbortError without trying another candidate', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  const abortError = Object.assign(new Error('client disconnected'), { name: 'AbortError' });
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    throw abortError;
  };
  try {
    await assert.rejects(
      createUpstreamStream({
        route: { provider: 'anthropic', tier: 'star' },
        maxTokens: 256,
        system: 'test',
        messages: [{ role: 'user', content: 'test' }],
        signal: undefined,
      }),
      (error) => error === abortError,
    );
    assert.deepEqual(calls, ['https://api.anthropic.com/v1/messages']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Task 23 returns a retryable 503 after all Anthropic candidates fail', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push(JSON.parse(options.body).model);
    throw new Error('upstream unavailable');
  };
  try {
    const response = await createUpstreamStream({
      route: { provider: 'anthropic', tier: 'star' },
      maxTokens: 256,
      system: 'test',
      messages: [{ role: 'user', content: 'test' }],
      signal: undefined,
    });
    assert.equal(response.status, 503);
    assert.match(await response.text(), /temporarily unavailable/);
    assert.equal(calls.length, 2);
    assert.notEqual(calls[0], calls[1]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Task 24 falls back to the next Anthropic candidate on a 404', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push(JSON.parse(options.body).model);
    if (calls.length === 1) return new Response('model not found', { status: 404 });
    return new Response('data: {"type":"content_block_delta","delta":{"text":"status fallback"}}\\n\\ndata: [DONE]\\n\\n', {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    });
  };
  try {
    const response = await createUpstreamStream({
      route: { provider: 'anthropic', tier: 'star' },
      maxTokens: 256,
      system: 'test',
      messages: [{ role: 'user', content: 'test' }],
      signal: undefined,
    });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'data: {"type":"content_block_delta","delta":{"text":"status fallback"}}\\n\\ndata: [DONE]\\n\\n');
    assert.equal(calls.length, 2);
    assert.notEqual(calls[0], calls[1]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Task 25 forwards the caller AbortSignal to Anthropic fetch', async () => {
  const originalFetch = globalThis.fetch;
  const controller = new AbortController();
  let receivedSignal;
  globalThis.fetch = async (url, options) => {
    receivedSignal = options.signal;
    return new Response('data: {"type":"content_block_delta","delta":{"text":"signal forwarded"}}\\n\\ndata: [DONE]\\n\\n', {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    });
  };
  try {
    const response = await createUpstreamStream({
      route: { provider: 'anthropic', tier: 'star' },
      maxTokens: 256,
      system: 'test',
      messages: [{ role: 'user', content: 'test' }],
      signal: controller.signal,
    });
    assert.equal(response.status, 200);
    assert.equal(receivedSignal, controller.signal);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Task 26 forwards the caller AbortSignal to Forge fetch', async () => {
  const originalFetch = globalThis.fetch;
  const controller = new AbortController();
  let receivedSignal;
  globalThis.fetch = async (url, options) => {
    receivedSignal = options.signal;
    return new Response(JSON.stringify({ choices: [{ message: { content: 'forge signal forwarded' } }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  try {
    const response = await createUpstreamStream({
      route: { provider: 'forge', model: 'gpt-5-mini', fallbackTier: 'star' },
      maxTokens: 256,
      system: 'test',
      messages: [{ role: 'user', content: 'test' }],
      signal: controller.signal,
    });
    assert.equal(response.status, 200);
    assert.equal(receivedSignal, controller.signal);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Task 27 falls back once when Forge returns a success response without a completion', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).includes('/v1/chat/completions')) {
      return new Response(JSON.stringify({ choices: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response('data: {"type":"content_block_delta","delta":{"text":"empty completion fallback"}}\n\ndata: [DONE]\n\n', {
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
    assert.equal(await response.text(), 'data: {"type":"content_block_delta","delta":{"text":"empty completion fallback"}}\n\ndata: [DONE]\n\n');
    assert.deepEqual(calls, ['https://forge.test/v1/chat/completions', 'https://api.anthropic.com/v1/messages']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Task 28 falls back once when Forge returns a whitespace-only completion', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).includes('/v1/chat/completions')) {
      return new Response(JSON.stringify({ choices: [{ message: { content: ' \n\t ' } }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response('data: {"type":"content_block_delta","delta":{"text":"whitespace completion fallback"}}\n\ndata: [DONE]\n\n', {
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
    assert.equal(await response.text(), 'data: {"type":"content_block_delta","delta":{"text":"whitespace completion fallback"}}\n\ndata: [DONE]\n\n');
    assert.deepEqual(calls, ['https://forge.test/v1/chat/completions', 'https://api.anthropic.com/v1/messages']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Task 29 preserves the complete specialist system prompt during Forge fallback', async () => {
  const originalFetch = globalThis.fetch;
  const specialistSystem = buildSystemPrompt('', 'fivem', 'fivem_resource', 'qbcore', 'security');
  let fallbackBody;
  globalThis.fetch = async (url, options) => {
    if (String(url).includes('/v1/chat/completions')) return new Response('provider unavailable', { status: 503 });
    fallbackBody = JSON.parse(options.body);
    return new Response('data: {"type":"content_block_delta","delta":{"text":"prompt preserved"}}\n\ndata: [DONE]\n\n', {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    });
  };
  try {
    const response = await createUpstreamStream({
      route: { provider: 'forge', model: 'gpt-5-mini', fallbackTier: 'star' },
      maxTokens: 256,
      system: specialistSystem,
      messages: [{ role: 'user', content: 'Create a QBCore FiveM resource and security review.' }],
      signal: undefined,
    });
    assert.equal(response.status, 200);
    assert.equal(fallbackBody.system, specialistSystem);
    assert.match(fallbackBody.system, /PLATFORM QUALITY GATE: FIVEM/);
    assert.match(fallbackBody.system, /WORKFLOW MODE: FIVEM RESOURCE/);
    assert.match(fallbackBody.system, /FRAMEWORK CONTEXT: QBCORE/);
    assert.match(fallbackBody.system, /ROLE OUTPUT CONTRACT:.*severity/);
  } finally {
    globalThis.fetch = originalFetch;
  }
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
