import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createMissionService } from '../lib/jarvis-missions.js';
import { memoryStore } from './helpers/jarvis-memory-store.mjs';

const owner = 'owner@example.com';

function setup() {
  const store = memoryStore();
  const generated = [];
  const researched = [];
  const providers = {
    capabilities: () => ({ ai: true, search: true, email: true, phoneConfigured: true, scheduler: true }),
    research: async query => {
      researched.push(query);
      return [{ title: 'Evidence', url: 'https://example.com/evidence', description: 'Fixture evidence' }];
    },
    generate: async args => {
      generated.push(args);
      return { text: args.role + ' output', usage: { inputTokens: 10, outputTokens: 10 } };
    },
    notifyOwner: async () => ({ status: 'accepted', message: 'Fixture accepted.' }),
  };
  return { store, generated, researched, service: createMissionService({ store, providers }) };
}

test('AI OS runs the six-agent executive chain and ends with the Brain brief', async () => {
  const { service, generated, researched } = setup();
  const mission = await service.create(owner, {
    requestId: 'ai-os-request-123456',
    objective: 'Decide the highest-value Stellar priority and give me a safe execution plan.',
    kind: 'ai_os',
    notify: { email: false, call: false },
  });
  assert.equal(mission.kind, 'ai_os');
  assert.equal(mission.steps.length, 6);
  assert.deepEqual(mission.steps.map(step => step.role), [
    'executive_assistant',
    'research',
    'revenue',
    'engineering',
    'operations',
    'chief_of_staff',
  ]);

  const result = await service.run(mission.id, owner);
  assert.equal(result.status, 'completed');
  assert.deepEqual(generated.map(item => item.role), [
    'executive_assistant',
    'research',
    'revenue',
    'engineering',
    'operations',
    'chief_of_staff',
  ]);
  assert.equal(researched.length, 2);
  assert.equal(result.summary, 'chief_of_staff output');
  assert.equal(result.ownerEmail, undefined);
});

test('AI OS status exposes the coordinated agent roster only after the owner-gated service call', async () => {
  const { service } = setup();
  const status = await service.status(owner);
  assert.deepEqual(status.agents.map(agent => agent.id), [
    'executive_assistant',
    'research',
    'revenue',
    'engineering',
    'operations',
    'chief_of_staff',
  ]);
  assert.equal(status.limits.retentionDays, 30);
});

test('AI OS page is private-by-default and uses the existing owner-gated mission API', () => {
  const page = readFileSync(new URL('../ai-os.html', import.meta.url), 'utf8');
  const client = readFileSync(new URL('../lib/assets/stellar-ai-os.js', import.meta.url), 'utf8');
  const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
  const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));

  assert.match(page, /meta name="robots" content="noindex,nofollow,noarchive"/);
  assert.match(page, /id="os" class="os-shell" hidden/);
  assert.match(client, /\/api\/desktop-agent\?surface=jarvis/);
  assert.match(client, /Authorization: 'Bearer ' \+ token\(\)/);
  assert.match(client, /kind: 'ai_os'/);
  assert.match(app, /function settingsOwnerTools\(\)/);
  assert.match(app, /id="ai-os-nav" href="\/ai-os"/);

  const route = vercel.rewrites.find(item => item.source === '/ai-os');
  assert.deepEqual(route, { source: '/ai-os', destination: '/ai-os.html' });
  const header = vercel.headers.find(item => item.source === '/ai-os');
  assert.ok(header);
  assert.ok(header.headers.some(item => item.key === 'Cache-Control' && item.value === 'private, no-store'));
  assert.ok(header.headers.some(item => item.key === 'X-Robots-Tag' && /noindex/.test(item.value)));

  const combined = page + client;
  assert.doesNotMatch(combined, /AUTH_SESSION_SECRET|OWNER_SECRET|TWILIO_AUTH_TOKEN|CALL_BRIDGE_TOKEN|sk-proj-|ghp_/i);
});

test('AI OS provider guidance defines each private specialist role', () => {
  const providers = readFileSync(new URL('../lib/jarvis-providers.js', import.meta.url), 'utf8');
  for (const role of ['executive_assistant','research','revenue','engineering','operations','chief_of_staff']) {
    assert.match(providers, new RegExp(role + ':'));
  }
  assert.match(providers, /Act as the AI Brain and chief of staff/);
});
