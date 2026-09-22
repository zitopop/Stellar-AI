import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const bridge = await readFile(new URL('../lib/roblox-studio-agent-handler.js', import.meta.url), 'utf8');
const planner = await readFile(new URL('../lib/roblox-studio-plan-handler.js', import.meta.url), 'utf8');
const api = await readFile(new URL('../api/desktop-agent.js', import.meta.url), 'utf8');
const plugin = await readFile(new URL('../roblox-studio-plugin/StellarAIPlugin.server.lua', import.meta.url), 'utf8');
const page = await readFile(new URL('../roblox-studio.html', import.meta.url), 'utf8');
const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));

test('Roblox Studio bridge keeps inspection read-only and edits approval-gated', () => {
  assert.match(bridge, /SAFE_TYPES=new Set\(\['inspect_tree','read_script'\]\)/);
  assert.match(bridge, /WRITE_TYPES=new Set\(\['ensure_folder','ensure_remote_event','ensure_remote_function','upsert_script'\]\)/);
  assert.match(bridge, /WRITE_TYPES\.has\(type\)&&!approved/);
  assert.match(bridge, /Owner access is required/);
  assert.match(bridge, /X-Stellar-Studio-Id/);
});

test('Roblox planner uses an inspect then implement loop', () => {
  assert.match(planner, /First understand the existing game/);
  assert.match(planner, /In inspect phase use only inspect_tree\/read_script/);
  assert.match(planner, /use the supplied observations as ground truth/);
  assert.match(planner, /server-authoritative Roblox systems/);
  assert.match(planner, /Do not claim the place was run, published, or play-tested/);
});

test('Studio plugin only exposes allowed services and creates undo waypoints', () => {
  for (const service of ['Workspace','ReplicatedStorage','ServerScriptService','ServerStorage','StarterGui','StarterPlayer','StarterPack','Lighting']) {
    assert.match(plugin, new RegExp(service + ' = true'));
  }
  assert.match(plugin, /ChangeHistoryService:SetWaypoint/);
  assert.match(plugin, /Unsupported Studio action/);
  assert.match(plugin, /plugin:SetSetting\(SETTING_TOKEN, deviceToken\)/);
});

test('Roblox Studio workspace is routed privately and uses the agent API', () => {
  assert.match(api, /surface==='roblox-studio'/);
  assert.match(api, /robloxStudioPlanHandler/);
  assert.match(page, /Build Roblox games/);
  assert.match(page, /Inspection complete · building grounded implementation plan/);
  assert.ok(vercel.rewrites.some(x => x.source === '/roblox-studio' && x.destination === '/roblox-studio.html'));
  const privateHeader = vercel.headers.find(x => x.source === '/roblox-studio');
  assert.equal(privateHeader?.headers?.some(h => h.key === 'Cache-Control' && h.value === 'private, no-store'), true);
});
