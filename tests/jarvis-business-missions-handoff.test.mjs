import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createMissionService } from '../lib/jarvis-missions.js';
import { memoryStore } from './helpers/jarvis-memory-store.mjs';

const vision = readFileSync(new URL('../jarvis-vision.html', import.meta.url), 'utf8');
const brain = readFileSync(new URL('../lib/assets/stellar-ai-os.js', import.meta.url), 'utf8');

test('Jarvis business missions and agents require verified private access', () => {
  assert.match(vision, /data\?\.owner===true&&jarvisAccess\.ownerControls===true/);
  assert.match(vision, /ownerVerified=false/);
  assert.match(vision, /ownerVerified=true/);
  assert.match(vision, /q\('\[data-jarvis-business\]'\)\?\.remove\(\)/);
  assert.match(vision, /business\.dataset\.jarvisBusiness='true'/);
  assert.match(vision, /if\(name==='Agents'\)\{if\(!ownerVerified\)/);
  assert.match(vision, /location\.href='\/ai-os'/);
  assert.match(vision, /ownerVerified && detectJarvisRoute\(prompt\)==='Business missions'/);
  assert.match(vision, /location\.href='\/app\?jarvis=chat&prompt='/);
});

test('AI OS only pre-fills a business objective and waits for an explicit run', () => {
  assert.match(brain, /function prefillJarvisObjective\(\)/);
  assert.match(brain, /url\.searchParams\.get\('objective'\)/);
  assert.match(brain, /url\.searchParams\.delete\('objective'\)/);
  assert.match(brain, /history\.replaceState\(/);
  assert.match(brain, /\$\('command-input'\)\.value = objective/);
  assert.match(brain, /prefillJarvisObjective\(\);\s*refresh\(\);/);
  assert.doesNotMatch(brain.slice(brain.indexOf('function prefillJarvisObjective()')), /api\('create'/);
});

test('Jarvis product research is not hardcoded to games when the owner sells websites', async () => {
  const research = [];
  const store = memoryStore();
  const service = createMissionService({
    store,
    providers: {
      capabilities: () => ({ ai: true, search: true, scheduler: false }),
      research: async query => {
        research.push(query);
        return [{ title: 'Evidence', url: 'https://example.com', description: 'Source' }];
      },
      generate: async () => ({ text: 'Drafted recommendations only; no sales claimed.' }),
      notifyOwner: async () => ({ status: 'unavailable' }),
    },
  });
  const mission = await service.create('owner@example.com', {
    requestId: 'business-websites-20261012',
    kind: 'products',
    objective: 'Research a productized website offer for local businesses.',
    notify: { email: false, call: false },
  });
  const result = await service.run(mission.id, 'owner@example.com');
  assert.equal(result.status, 'completed');
  assert.ok(research[0].includes('buyer needs'));
  assert.ok(!research[0].includes('FiveM Roblox'));
});
