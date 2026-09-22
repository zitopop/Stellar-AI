import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const auth = await readFile(new URL('../api/auth.js', import.meta.url), 'utf8');
const app = await readFile(new URL('../app.html', import.meta.url), 'utf8');
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const checker = await readFile(new URL('../scripts/check-source.mjs', import.meta.url), 'utf8');

test('valid signed sessions can refresh before expiry without re-entering credentials', () => {
  assert.match(auth, /action === 'refreshSession'/);
  assert.match(auth, /const session = readSession\(req\)/);
  assert.match(auth, /session: createSession\(session\.email\)/);
  assert.match(app, /SESSION_REFRESH_LEAD_MS = 10 \* 60 \* 1000/);
  assert.match(app, /refreshSessionBeforeExpiry\(expectedSession\)/);
  assert.match(app, /body: JSON\.stringify\(\{ action: 'refreshSession' \}\)/);
  assert.match(app, /scheduleSessionExpiry\(\)/);
});

test('owner coding-agent launchers are integrated into the main app and remain owner-gated', () => {
  assert.match(app, /id="desktop-agent-nav"[^>]*location\.href='\/desktop'/);
  assert.match(app, /id="roblox-studio-nav"[^>]*location\.href='\/roblox-studio'/);
  assert.match(app, /desktopAgentNav\.style\.display = isOwner\(\) \? '' : 'none'/);
  assert.match(app, /robloxStudioNav\.style\.display = isOwner\(\) \? '' : 'none'/);
});

test('paid-plan cards communicate the stronger plan-specific AI behavior', () => {
  assert.match(app, /Stronger context \+ deliberate self-review/);
  assert.match(app, /Deeper architecture, debugging \+ edge-case checks/);
  assert.match(app, /Stronger multi-file consistency \+ validation/);
  assert.match(app, /Maximum multi-pass engineering review/);
});

test('repository exposes one deterministic local quality command', () => {
  assert.equal(pkg.scripts?.test, 'node --test tests/*.test.mjs');
  assert.equal(pkg.scripts?.['check:syntax'], 'node scripts/check-source.mjs');
  assert.equal(pkg.scripts?.check, 'npm run check:syntax && npm test');
  assert.match(String(pkg.engines?.node || ''), />=22/);
  assert.match(checker, /node.*--check|execFileSync/);
});
