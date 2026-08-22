import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

process.env.BUILT_IN_FORGE_API_URL = 'https://forge.test';
process.env.BUILT_IN_FORGE_API_KEY = 'test-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

const { addImageToLastUserMessage, buildSystemPrompt, default: chatHandler, detectFramework, detectPlatform, detectWorkflowMode, resolveRoute, createUpstreamStream, exceedsRequestPayloadLimit, forgeEventStream, getCombinedRequestPayloadLength, getForgeGenerationOptions, getModelCandidates, hasLatestUserMessage, hasUserMessage, normaliseClientIp, normaliseImageAttachment, normaliseMessages, normaliseRoutingInput, normaliseSearchContext, resolveModelTier, toForgeMessages, FORGE_MODELS, PLATFORM_GUIDANCE, ROLE_OUTPUT_CONTRACTS, ROLE_RESPONSE_SCHEMAS, ROUTING_ROLES, WORKFLOW_GUIDANCE } = await import('../api/chat.js');

test('Task 1 exposes the approved specialist role contract', () => {
  assert.deepEqual(Object.keys(ROUTING_ROLES).sort(), ['implementer', 'planner', 'researcher', 'security', 'tester']);
  assert.equal(FORGE_MODELS.has('gpt-5-mini'), true);
  assert.equal(FORGE_MODELS.has('gemini-3-flash-preview'), true);
});

test('model aliases resolve to concrete supported Anthropic models with a safe Sonnet fallback', () => {
  assert.equal(getModelCandidates(resolveModelTier('fabie', 'pro'))[0], 'claude-haiku-4-5-20251001');
  assert.equal(getModelCandidates(resolveModelTier('smart', 'pro'))[0], 'claude-sonnet-4-6');
  assert.equal(getModelCandidates(resolveModelTier('ultra', 'pro'))[0], 'claude-opus-4-8');
  assert.equal(getModelCandidates(resolveModelTier('unrecognised-model', 'pro'))[0], 'claude-sonnet-4-6');
});

test('Task 203 keeps Nova denied on every non-Pro plan while retaining Pro access', () => {
  for (const plan of ['free', 'lite', 'plus']) {
    assert.equal(resolveModelTier('ultra', plan), 'star', `${plan} must fall back to Star`);
    assert.notEqual(resolveModelTier('ultra', plan), 'nova', `${plan} must not resolve Nova`);
  }
  assert.equal(resolveModelTier('ultra', 'pro'), 'nova');
  assert.equal(resolveModelTier('ultra', 'owner'), 'nova');
});

test('Task 204 defaults unknown plan labels to Free-tier Nova protection', () => {
  for (const plan of ['', 'pro ', 'enterprise', null, undefined]) {
    assert.equal(resolveModelTier('ultra', plan), 'star', `${String(plan)} must use the safe Star fallback`);
    assert.notEqual(resolveModelTier('ultra', plan), 'nova', `${String(plan)} must not bypass Nova gating`);
  }
});

test('Task 205 routes the public ultra alias to Star outside Pro and Nova on Pro', () => {
  for (const plan of ['free', 'lite', 'plus']) {
    const route = resolveRoute('ultra', '', plan);
    assert.equal(route.provider, 'anthropic');
    assert.equal(route.tier, 'star', `${plan} must route ultra to Star`);
    assert.notEqual(route.tier, 'nova', `${plan} must not route ultra to Nova`);
  }
  assert.equal(resolveRoute('ultra', '', 'pro').tier, 'nova');
  assert.equal(resolveRoute('ultra', '', 'owner').tier, 'nova');
});

test('Task 206 keeps the canonical Nova identifier gated to Pro and owner plans', () => {
  for (const plan of ['free', 'lite', 'plus']) {
    assert.equal(resolveModelTier('claude-opus-4-8', plan), 'star', `${plan} must fall back to Star`);
    assert.equal(resolveRoute('claude-opus-4-8', '', plan).tier, 'star', `${plan} route must fall back to Star`);
  }
  assert.equal(resolveModelTier('claude-opus-4-8', 'pro'), 'nova');
  assert.equal(resolveRoute('claude-opus-4-8', '', 'owner').tier, 'nova');
});

test('Task 207 keeps every recognised Nova alias gated to Pro and owner plans', () => {
  const novaAliases = ['nova', 'ultra', 'fable', 'claude-fable-5', 'claude-opus-4-8'];
  for (const alias of novaAliases) {
    assert.equal(resolveModelTier(alias, 'free'), 'star', `${alias} must fall back to Star on Free`);
    assert.equal(resolveModelTier(alias, 'plus'), 'star', `${alias} must fall back to Star on Plus`);
    assert.equal(resolveModelTier(alias, 'pro'), 'nova', `${alias} must resolve Nova on Pro`);
  }
});

test('Task 208 normalizes Nova aliases without weakening their Pro-only gate', () => {
  for (const alias of [' ULTRA ', 'NoVa', '\tClAuDe-OpUs-4-8\n']) {
    assert.equal(resolveModelTier(alias, 'free'), 'star', `${JSON.stringify(alias)} must fall back to Star on Free`);
    assert.equal(resolveModelTier(alias, 'plus'), 'star', `${JSON.stringify(alias)} must fall back to Star on Plus`);
    assert.equal(resolveModelTier(alias, 'pro'), 'nova', `${JSON.stringify(alias)} must resolve Nova on Pro`);
  }
});

test('Task 209 safely routes unknown model inputs to Star on every plan tier', () => {
  for (const plan of ['free', 'lite', 'plus', 'pro', 'owner']) {
    const route = resolveRoute('not-a-real-model', '', plan);
    assert.equal(resolveModelTier('not-a-real-model', plan), 'star', `${plan} must resolve the safe Star tier`);
    assert.equal(route.provider, 'anthropic');
    assert.equal(route.tier, 'star', `${plan} must route the unknown model to Star`);
    assert.notEqual(route.tier, 'nova', `${plan} must not route the unknown model to Nova`);
  }
});

test('Task 210 safely routes malformed model inputs to Star without premium access', () => {
  for (const model of [null, undefined, {}, [], 42]) {
    const route = resolveRoute(model, '', 'pro');
    assert.equal(resolveModelTier(model, 'free'), 'star', `${String(model)} must resolve Star on Free`);
    assert.equal(resolveModelTier(model, 'pro'), 'star', `${String(model)} must resolve Star on Pro`);
    assert.equal(route.provider, 'anthropic');
    assert.equal(route.tier, 'star', `${String(model)} must route to Star`);
    assert.notEqual(route.tier, 'nova', `${String(model)} must not route to Nova`);
  }
});

test('Task 211 safely routes oversized model inputs to Star without premium access', () => {
  const oversizedModel = `ultra${'x'.repeat(128)}`;
  const route = resolveRoute(oversizedModel, '', 'pro');
  assert.equal(resolveModelTier(oversizedModel, 'free'), 'star');
  assert.equal(resolveModelTier(oversizedModel, 'pro'), 'star');
  assert.equal(route.provider, 'anthropic');
  assert.equal(route.tier, 'star');
  assert.notEqual(route.tier, 'nova');
});

test('Task 212 keeps every recognised Nova alias behind route-level Pro gating', () => {
  const novaAliases = ['nova', 'ultra', 'fable', 'claude-fable-5', 'claude-opus-4-8'];
  for (const alias of novaAliases) {
    const freeRoute = resolveRoute(alias, '', 'free');
    const plusRoute = resolveRoute(alias, '', 'plus');
    assert.equal(freeRoute.provider, 'anthropic');
    assert.equal(freeRoute.tier, 'star', `${alias} must route to Star on Free`);
    assert.equal(plusRoute.tier, 'star', `${alias} must route to Star on Plus`);
    assert.equal(resolveRoute(alias, '', 'pro').tier, 'nova', `${alias} must route to Nova on Pro`);
  }
});

test('Task 213 keeps every supported tier on a concrete primary-and-fallback candidate chain', () => {
  assert.deepEqual(getModelCandidates('spark'), ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6']);
  assert.deepEqual(getModelCandidates('star'), ['claude-sonnet-4-6', 'claude-haiku-4-5-20251001']);
  assert.deepEqual(getModelCandidates('comet'), ['claude-opus-4-6', 'claude-sonnet-4-6']);
  assert.deepEqual(getModelCandidates('nova'), ['claude-opus-4-8', 'claude-sonnet-4-6']);
});

test('Task 214 safely falls back to the Star candidate chain for unsupported tiers', () => {
  const safeStarCandidates = ['claude-sonnet-4-6', 'claude-haiku-4-5-20251001'];
  assert.deepEqual(getModelCandidates('not-a-tier'), safeStarCandidates);
  assert.deepEqual(getModelCandidates(null), safeStarCandidates);
  assert.deepEqual(getModelCandidates(undefined), safeStarCandidates);
});

test('Task 215 keeps candidate chains isolated between routing requests', () => {
  const firstCandidates = getModelCandidates('star');
  firstCandidates[0] = 'caller-mutated-model';
  assert.deepEqual(getModelCandidates('star'), ['claude-sonnet-4-6', 'claude-haiku-4-5-20251001']);
});

test('Task 216 keeps every recognised Nova alias available to the owner plan', () => {
  for (const alias of ['nova', 'ultra', 'fable', 'claude-fable-5', 'claude-opus-4-8']) {
    const route = resolveRoute(alias, '', 'owner');
    assert.equal(route.provider, 'anthropic');
    assert.equal(route.tier, 'nova', `${alias} must route to Nova for the owner plan`);
  }
});

test('Task 217 keeps specialist-role routing from elevating Free or Plus ultra requests to Nova', () => {
  for (const role of ['planner', 'implementer', 'researcher', 'security', 'tester']) {
    for (const plan of ['free', 'plus']) {
      const route = resolveRoute('ultra', role, plan);
      assert.notEqual(route.tier, 'nova', `${role} must not route ${plan} ultra requests to Nova`);
      assert.equal(route.role, role);
    }
  }
});

test('Task 218 keeps unknown role labels from affecting non-Pro ultra plan gating', () => {
  for (const plan of ['free', 'plus']) {
    const route = resolveRoute('ultra', 'unknown-role', plan);
    assert.equal(route.role, 'implementer');
    assert.equal(route.provider, 'forge');
    assert.equal(route.model, 'claude-sonnet-4-6');
    assert.equal(route.fallbackTier, 'star', `unknown roles must retain the Star fallback on ${plan}`);
    assert.notEqual(route.model, 'claude-opus-4-8');
  }
});

test('Task 219 keeps malformed role values from affecting non-Pro ultra plan gating', () => {
  for (const role of [null, undefined, {}, [], 42]) {
    for (const plan of ['free', 'plus']) {
      const route = resolveRoute('ultra', role, plan);
      assert.equal(route.role, 'implementer');
      assert.equal(route.provider, 'anthropic');
      assert.equal(route.tier, 'star', `${String(role)} must retain the Star fallback on ${plan}`);
      assert.notEqual(route.tier, 'nova');
    }
  }
});

test('Task 220 keeps normalized premium-role labels gated to Star outside Pro', () => {
  for (const [input, role] of [[' SECURITY ', 'security'], ['TeStEr', 'tester']]) {
    for (const plan of ['free', 'plus']) {
      const route = resolveRoute('ultra', input, plan);
      assert.equal(route.role, role);
      assert.equal(route.provider, 'anthropic');
      assert.equal(route.tier, 'star', `${input} must retain the Star fallback on ${plan}`);
      assert.notEqual(route.tier, 'nova');
    }
  }
});

test('Task 221 keeps every premium specialist model route available on Pro', () => {
  for (const [role, model] of [['security', 'gpt-5'], ['tester', 'claude-opus-4-7']]) {
    const route = resolveRoute('ultra', role, 'pro');
    assert.equal(route.role, role);
    assert.equal(route.provider, 'forge');
    assert.equal(route.model, model);
    assert.equal(route.fallbackTier, 'star');
  }
});

test('Task 222 keeps every premium specialist route on Star for the legacy Lite plan', () => {
  for (const role of ['security', 'tester']) {
    const route = resolveRoute('ultra', role, 'lite');
    assert.equal(route.role, role);
    assert.equal(route.provider, 'anthropic');
    assert.equal(route.tier, 'star', `${role} must remain on Star for Lite`);
    assert.notEqual(route.tier, 'nova');
  }
});

test('Task 223 keeps every premium specialist model route available to the owner plan', () => {
  for (const [role, model] of [['security', 'gpt-5'], ['tester', 'claude-opus-4-7']]) {
    const route = resolveRoute('ultra', role, 'owner');
    assert.equal(route.role, role);
    assert.equal(route.provider, 'forge');
    assert.equal(route.model, model);
    assert.equal(route.fallbackTier, 'star');
  }
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

test('Task 35 normalizes recognised specialist role input before applying its contract', () => {
  const route = resolveRoute('smart', ' SECURITY ', 'pro');
  assert.equal(route.provider, 'forge');
  assert.equal(route.model, 'gpt-5');
  assert.equal(route.role, 'security');
  assert.equal(route.instruction, ROUTING_ROLES.security.instruction);
  assert.equal(ROLE_RESPONSE_SCHEMAS[route.role], ROLE_RESPONSE_SCHEMAS.security);
  assert.match(buildSystemPrompt('', 'general', 'general', 'unknown', route.role), /ROLE OUTPUT CONTRACT:.*severity/);
});

test('Task 36 resolves unknown specialist role input to the default implementer contract', () => {
  const route = resolveRoute('smart', 'not-a-real-role', 'pro');
  assert.equal(route.provider, 'forge');
  assert.equal(route.model, 'claude-sonnet-4-6');
  assert.equal(route.role, 'implementer');
  assert.equal(route.instruction, ROUTING_ROLES.implementer.instruction);
  assert.equal(ROLE_RESPONSE_SCHEMAS[route.role], ROLE_RESPONSE_SCHEMAS.implementer);
  assert.match(buildSystemPrompt('', 'general', 'general', 'unknown', route.role), /ROLE OUTPUT CONTRACT:.*complete destination/);
});

test('Task 37 preserves the requested model when no specialist role is selected', () => {
  const route = resolveRoute('gpt-5-mini', '', 'lite');
  assert.equal(route.provider, 'forge');
  assert.equal(route.model, 'gpt-5-mini');
  assert.equal(route.role, 'implementer');
  assert.equal(route.instruction, ROUTING_ROLES.implementer.instruction);
  assert.equal(ROLE_RESPONSE_SCHEMAS[route.role], ROLE_RESPONSE_SCHEMAS.implementer);
});

test('Task 38 rejects inherited object-property names as specialist roles', () => {
  const route = resolveRoute('smart', 'constructor', 'pro');
  assert.equal(route.provider, 'forge');
  assert.equal(route.model, 'claude-sonnet-4-6');
  assert.equal(route.role, 'implementer');
  assert.equal(route.instruction, ROUTING_ROLES.implementer.instruction);
});

test('Task 53 normalizes bounded forwarded client identity before rate-limit keys', () => {
  assert.equal(normaliseClientIp(' 203.0.113.24, 10.0.0.2 '), '203.0.113.24');
  assert.equal(normaliseClientIp(['2001:db8::7, 10.0.0.2']), '2001:db8::7');
  assert.equal(normaliseClientIp('  \n\t '), 'unknown');
  assert.equal(normaliseClientIp('x'.repeat(129)), 'unknown');
});

test('Task 54 rejects malformed forwarded client identity before rate-limit keys', () => {
  assert.equal(normaliseClientIp('999.999.999.999'), 'unknown');
  assert.equal(normaliseClientIp('203.0.113.24:6379'), 'unknown');
  assert.equal(normaliseClientIp('203.0.113.24\nrl:other:free'), 'unknown');
  assert.equal(normaliseClientIp('::ffff:192.0.2.128'), '::ffff:192.0.2.128');
});

test('Task 55 normalizes bounded untrusted search context before prompt construction', () => {
  assert.equal(normaliseSearchContext('  https://example.test\u0000\nUseful source\u0007  '), 'https://example.test\nUseful source');
  assert.equal(normaliseSearchContext('x'.repeat(40_001)).length, 40_000);
  assert.equal(normaliseSearchContext({ text: 'not a string' }), '');
  assert.match(buildSystemPrompt('\u0000Source: https://example.test'), /Source: https:\/\/example\.test/);
});

test('Task 56 caps individual message content before normalization work', () => {
  const normalized = normaliseMessages([
    { role: 'user', content: `${'x'.repeat(100_000)} trailing content that must not be retained` },
    { role: 'assistant', content: 'Recent assistant context stays intact.' },
  ]);
  assert.equal(normalized[0].content.length, 100_000);
  assert.equal(normalized[1].content, 'Recent assistant context stays intact.');
});

test('Task 59 accepts images only when a normalized user message can carry them', () => {
  assert.equal(hasUserMessage([{ role: 'assistant', content: 'Prior output' }]), false);
  assert.equal(hasUserMessage([{ role: 'assistant', content: 'Prior output' }, { role: 'user', content: 'Please review this image.' }]), true);
});

test('Task 60 requires an image to align with the latest normalized user turn', () => {
  assert.equal(hasLatestUserMessage([{ role: 'user', content: 'Previous request' }, { role: 'assistant', content: 'Prior output' }]), false);
  assert.equal(hasLatestUserMessage([{ role: 'assistant', content: 'Prior output' }, { role: 'user', content: 'Please review this image.' }]), true);
});

test('Task 61 validates decoded image signatures against declared media types', () => {
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from([0x00, 0x00, 0x00, 0x0d]), Buffer.from('IHDR'), Buffer.alloc(13), Buffer.alloc(4),
    Buffer.alloc(4), Buffer.from('IEND'), Buffer.alloc(4),
  ]).toString('base64');
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x02, 0xff, 0xd9]).toString('base64');
  const gif = Buffer.concat([Buffer.from('GIF89a', 'ascii'), Buffer.from([0x01, 0x00, 0x01, 0x00]), Buffer.alloc(3), Buffer.from([0x3b])]).toString('base64');
  const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0x0e, 0x00, 0x00, 0x00]), Buffer.from('WEBPVP8 '), Buffer.from([0x01, 0x00, 0x00, 0x00]), Buffer.alloc(2)]).toString('base64');
  assert.equal(normaliseImageAttachment({ mediaType: 'image/png', data: png }).error, undefined);
  assert.equal(normaliseImageAttachment({ mediaType: 'image/jpeg', data: jpeg }).error, undefined);
  assert.equal(normaliseImageAttachment({ mediaType: 'image/gif', data: gif }).error, undefined);
  assert.equal(normaliseImageAttachment({ mediaType: 'image/webp', data: webp }).error, undefined);
  assert.match(normaliseImageAttachment({ mediaType: 'image/png', data: jpeg }).error, /does not match its declared file type/);
});

test('Task 63 rejects image payloads that stop after a valid-looking header', () => {
  const truncatedPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).toString('base64');
  const truncatedJpeg = Buffer.from([0xff, 0xd8, 0xff]).toString('base64');
  const truncatedGif = Buffer.from('GIF89a', 'ascii').toString('base64');
  const truncatedWebp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')]).toString('base64');
  assert.match(normaliseImageAttachment({ mediaType: 'image/png', data: truncatedPng }).error, /incomplete/);
  assert.match(normaliseImageAttachment({ mediaType: 'image/jpeg', data: truncatedJpeg }).error, /incomplete/);
  assert.match(normaliseImageAttachment({ mediaType: 'image/gif', data: truncatedGif }).error, /incomplete/);
  assert.match(normaliseImageAttachment({ mediaType: 'image/webp', data: truncatedWebp }).error, /incomplete/);
});

test('Task 64 rejects malformed primary image structures despite matching headers and trailers', () => {
  const malformedPng = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(4), Buffer.from('IHDR'), Buffer.alloc(13), Buffer.alloc(4),
    Buffer.alloc(4), Buffer.from('IEND'), Buffer.alloc(4),
  ]).toString('base64');
  const malformedJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString('base64');
  const malformedGif = Buffer.concat([Buffer.from('GIF89a', 'ascii'), Buffer.alloc(7), Buffer.from([0x3b])]).toString('base64');
  const malformedWebp = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0x0c, 0x00, 0x00, 0x00]), Buffer.from('WEBPVP8 '), Buffer.alloc(4)]).toString('base64');
  assert.match(normaliseImageAttachment({ mediaType: 'image/png', data: malformedPng }).error, /incomplete/);
  assert.match(normaliseImageAttachment({ mediaType: 'image/jpeg', data: malformedJpeg }).error, /incomplete/);
  assert.match(normaliseImageAttachment({ mediaType: 'image/gif', data: malformedGif }).error, /incomplete/);
  assert.match(normaliseImageAttachment({ mediaType: 'image/webp', data: malformedWebp }).error, /incomplete/);
});

test('Task 65 bounds untrusted model and role route inputs before resolution', () => {
  assert.equal(normaliseRoutingInput('  GPT-5-MINI  '), 'gpt-5-mini');
  assert.equal(normaliseRoutingInput({ model: 'gpt-5-mini' }), '');
  assert.equal(normaliseRoutingInput('x'.repeat(129)), 'x'.repeat(128));
  assert.equal(resolveRoute('x'.repeat(129), 'researcher', 'pro').role, 'researcher');
  assert.equal(resolveRoute('gpt-5-mini', 'x'.repeat(129), 'pro').role, 'implementer');
});

test('Task 66 clears the request timeout and disconnect listener after a streamed chat response', async () => {
  const originalFetch = globalThis.fetch;
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const timeoutHandle = Symbol('chat-timeout');
  const clearedTimeouts = [];
  const response = new EventEmitter();
  response.headersSent = false;
  response.writableEnded = false;
  response.setHeader = () => {};
  response.status = (statusCode) => {
    response.statusCode = statusCode;
    return response;
  };
  response.json = (body) => {
    response.body = body;
    response.headersSent = true;
    response.writableEnded = true;
    return response;
  };
  response.flushHeaders = () => {
    response.headersSent = true;
  };
  response.write = (chunk) => {
    response.chunks = `${response.chunks || ''}${chunk}`;
  };
  response.end = () => {
    response.writableEnded = true;
  };

  try {
    globalThis.fetch = async () => new Response('data: [DONE]\n\n', { status: 200 });
    globalThis.setTimeout = () => timeoutHandle;
    globalThis.clearTimeout = (handle) => clearedTimeouts.push(handle);
    await chatHandler({
      method: 'POST',
      headers: { 'x-forwarded-for': '127.0.0.1' },
      body: { model: 'gpt-5-mini', messages: [{ role: 'user', content: 'Build a FiveM resource.' }] },
    }, response);
    assert.equal(response.statusCode, 200);
    assert.match(response.chunks, /data: \[DONE\]/);
    assert.deepEqual(clearedTimeouts, [timeoutHandle]);
    assert.equal(response.listenerCount('close'), 0);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

test('Task 66 clears the request timeout and disconnect listener after an upstream error', async () => {
  const originalFetch = globalThis.fetch;
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const timeoutHandle = Symbol('chat-timeout');
  const clearedTimeouts = [];
  const response = new EventEmitter();
  response.headersSent = false;
  response.writableEnded = false;
  response.setHeader = () => {};
  response.status = (statusCode) => {
    response.statusCode = statusCode;
    return response;
  };
  response.json = (body) => {
    response.body = body;
    response.headersSent = true;
    response.writableEnded = true;
    return response;
  };

  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: 'Provider unavailable' } }), { status: 503 });
    globalThis.setTimeout = () => timeoutHandle;
    globalThis.clearTimeout = (handle) => clearedTimeouts.push(handle);
    await chatHandler({
      method: 'POST',
      headers: { 'x-forwarded-for': '127.0.0.1' },
      body: { model: 'gpt-5-mini', messages: [{ role: 'user', content: 'Build a FiveM resource.' }] },
    }, response);
    assert.equal(response.statusCode, 503);
    assert.match(response.body.error, /Provider unavailable/);
    assert.deepEqual(clearedTimeouts, [timeoutHandle]);
    assert.equal(response.listenerCount('close'), 0);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

test('Task 62 inserts an image only into the final user entry before provider serialization', () => {
  const originalMessages = [
    { role: 'user', content: 'Earlier question' },
    { role: 'assistant', content: 'Earlier answer' },
    { role: 'user', content: 'Please review this current screenshot.' },
  ];
  const providerMessages = toForgeMessages(addImageToLastUserMessage(originalMessages, {
    mediaType: 'image/png',
    data: 'iVBORw0KGgo=',
  }));
  assert.deepEqual(providerMessages.slice(0, 2), originalMessages.slice(0, 2));
  assert.deepEqual(providerMessages[2], {
    role: 'user',
    content: [
      { type: 'image_url', image_url: { url: 'data:image/png;base64,iVBORw0KGgo=' } },
      { type: 'text', text: 'Please review this current screenshot.' },
    ],
  });
  assert.deepEqual(originalMessages[2], { role: 'user', content: 'Please review this current screenshot.' });
});

test('Task 42 keeps valid messages when trailing blank records would otherwise exhaust the history window', () => {
  const trailingBlanks = Array.from({ length: 40 }, () => ({ role: 'assistant', content: ' \n\t ' }));
  assert.deepEqual(normaliseMessages([
    { role: 'user', content: '  Build a QBCore FiveM resource.  ' },
    { role: 'assistant', content: '  I need the command names.  ' },
    ...trailingBlanks,
    { role: 'user', content: null },
  ]), [
    { role: 'user', content: 'Build a QBCore FiveM resource.' },
    { role: 'assistant', content: 'I need the command names.' },
  ]);
});

test('Task 43 accepts a bounded supported image attachment and rejects invalid provider payload metadata', () => {
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from([0x00, 0x00, 0x00, 0x0d]), Buffer.from('IHDR'), Buffer.alloc(13), Buffer.alloc(4),
    Buffer.alloc(4), Buffer.from('IEND'), Buffer.alloc(4),
  ]).toString('base64');
  assert.deepEqual(normaliseImageAttachment({ mediaType: ' IMAGE/PNG ', data: ` ${png} ` }), {
    image: { mediaType: 'image/png', data: png },
  });
  assert.match(normaliseImageAttachment({ mediaType: 'image/svg+xml', data: 'dGVzdA==' }).error, /PNG, JPEG, GIF, or WebP/);
  assert.match(normaliseImageAttachment({ mediaType: 'image/jpeg', data: 'not base64!' }).error, /invalid or too large/);
  assert.match(normaliseImageAttachment({ mediaType: 'image/jpeg', data: 'abcde' }).error, /invalid or too large/);
  assert.match(normaliseImageAttachment({ mediaType: 'image/webp', data: 'A'.repeat(4_000_001) }).error, /invalid or too large/);
});

test('Task 50 bounds the combined text and image payload before routing', () => {
  const messages = [{ role: 'user', content: 'Build a QBCore resource.' }];
  const messageLength = JSON.stringify(messages).length;
  const fittingImage = { data: 'A'.repeat(5_000_000 - messageLength) };
  const oversizedImage = { data: `${fittingImage.data}A` };
  assert.equal(getCombinedRequestPayloadLength(messages, fittingImage), 5_000_000);
  assert.equal(exceedsRequestPayloadLimit(messages, fittingImage), false);
  assert.equal(exceedsRequestPayloadLimit(messages, oversizedImage), true);
  assert.equal(exceedsRequestPayloadLimit(messages, undefined), false);
});

test('Task 46 ignores unusable Forge multipart content and falls back when no text remains', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).includes('/v1/chat/completions')) {
      return new Response(JSON.stringify({ choices: [{ message: { content: [{ type: 'tool_call', text: { name: 'invalid' } }, { type: 'image' }] } }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response('data: {"type":"content_block_delta","delta":{"text":"multipart fallback"}}\n\ndata: [DONE]\n\n', {
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
    assert.equal(await response.text(), 'data: {"type":"content_block_delta","delta":{"text":"multipart fallback"}}\n\ndata: [DONE]\n\n');
    assert.deepEqual(calls, ['https://forge.test/v1/chat/completions', 'https://api.anthropic.com/v1/messages']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Task 47 streams valid Forge multipart text in order without fallback', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return new Response(JSON.stringify({ choices: [{ message: { content: [
      { type: 'text', text: 'Build ' },
      { type: 'tool_call', id: 'ignored' },
      { type: 'text', text: 'complete.' },
    ] } }] }), {
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
      signal: undefined,
    });
    assert.equal(response.status, 200);
    assert.match(await response.text(), /"text":"Build complete\."/);
    assert.deepEqual(calls, ['https://forge.test/v1/chat/completions']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Task 48 falls back when Forge returns a non-text single content object', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).includes('/v1/chat/completions')) {
      return new Response(JSON.stringify({ choices: [{ message: { content: { type: 'tool_call', arguments: {} } } }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response('data: {"type":"content_block_delta","delta":{"text":"single-content fallback"}}\n\ndata: [DONE]\n\n', {
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
    assert.equal(await response.text(), 'data: {"type":"content_block_delta","delta":{"text":"single-content fallback"}}\n\ndata: [DONE]\n\n');
    assert.deepEqual(calls, ['https://forge.test/v1/chat/completions', 'https://api.anthropic.com/v1/messages']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Task 44 bounds raw chat-history normalization while retaining the newest valid messages', () => {
  const ignoredOldMessage = {};
  Object.defineProperty(ignoredOldMessage, 'role', { get: () => { throw new Error('older records must not be evaluated'); } });
  const trailingBlankRecords = Array.from({ length: 360 }, () => ({ role: 'user', content: '  ' }));
  const newestValidMessages = Array.from({ length: 40 }, (_, index) => ({ role: index % 2 ? 'assistant' : 'user', content: ` newest ${index} ` }));
  const normalized = normaliseMessages([ignoredOldMessage, ...trailingBlankRecords, ...newestValidMessages]);
  assert.equal(normalized.length, 40);
  assert.deepEqual(normalized[0], { role: 'user', content: 'newest 0' });
  assert.deepEqual(normalized.at(-1), { role: 'assistant', content: 'newest 39' });
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

test('Task 34 normalizes non-finite Forge token inputs to a valid minimum', () => {
  assert.deepEqual(getForgeGenerationOptions('gpt-5-mini', Infinity), {
    max_completion_tokens: 64,
    reasoning: { effort: 'low' },
  });
  assert.deepEqual(getForgeGenerationOptions('gemini-3-flash-preview', Number.NaN), {
    max_tokens: 64,
    reasoning_effort: 'low',
  });
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

test('Task 30 tries the next Anthropic candidate when a successful response has no stream body', async () => {
  const originalFetch = globalThis.fetch;
  const models = [];
  globalThis.fetch = async (_url, options) => {
    models.push(JSON.parse(options.body).model);
    if (models.length === 1) return new Response(null, { status: 200 });
    return new Response('data: {"type":"content_block_delta","delta":{"text":"stream body fallback"}}\n\ndata: [DONE]\n\n', {
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
    assert.equal(await response.text(), 'data: {"type":"content_block_delta","delta":{"text":"stream body fallback"}}\n\ndata: [DONE]\n\n');
    assert.equal(models.length, 2);
    assert.notEqual(models[0], models[1]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Task 31 tries the next Anthropic candidate after a transient 503 response', async () => {
  const originalFetch = globalThis.fetch;
  const models = [];
  globalThis.fetch = async (_url, options) => {
    models.push(JSON.parse(options.body).model);
    if (models.length === 1) return new Response('provider unavailable', { status: 503 });
    return new Response('data: {"type":"content_block_delta","delta":{"text":"transient status fallback"}}\n\ndata: [DONE]\n\n', {
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
    assert.equal(await response.text(), 'data: {"type":"content_block_delta","delta":{"text":"transient status fallback"}}\n\ndata: [DONE]\n\n');
    assert.equal(models.length, 2);
    assert.notEqual(models[0], models[1]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Task 32 preserves a permanent Anthropic 401 without trying another candidate', async () => {
  const originalFetch = globalThis.fetch;
  const models = [];
  globalThis.fetch = async (_url, options) => {
    models.push(JSON.parse(options.body).model);
    return new Response('invalid credentials', { status: 401 });
  };
  try {
    const response = await createUpstreamStream({
      route: { provider: 'anthropic', tier: 'star' },
      maxTokens: 256,
      system: 'test',
      messages: [{ role: 'user', content: 'test' }],
      signal: undefined,
    });
    assert.equal(response.status, 401);
    assert.equal(await response.text(), 'invalid credentials');
    assert.equal(models.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Task 33 tries the next Anthropic candidate after a 400 response', async () => {
  const originalFetch = globalThis.fetch;
  const models = [];
  globalThis.fetch = async (_url, options) => {
    models.push(JSON.parse(options.body).model);
    if (models.length === 1) return new Response('unsupported request', { status: 400 });
    return new Response('data: {"type":"content_block_delta","delta":{"text":"client status fallback"}}\n\ndata: [DONE]\n\n', {
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
    assert.equal(await response.text(), 'data: {"type":"content_block_delta","delta":{"text":"client status fallback"}}\n\ndata: [DONE]\n\n');
    assert.equal(models.length, 2);
    assert.notEqual(models[0], models[1]);
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
