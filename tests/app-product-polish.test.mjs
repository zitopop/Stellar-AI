import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const landing = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('returning paid-model preference waits for server plan truth before activation', () => {
  assert.match(app, /Store\.get\('selectedModel','star'\)/);
  assert.match(app, /const model=\{current:'star'\}/);
  assert.match(app, /function reconcilePreferredModel\(\)/);
  assert.match(app, /function updateModelLocks\(\)[\s\S]*?reconcilePreferredModel\(\)/);
  assert.match(app, /applyModelSelection\('star',\{persist:false,announce:false\}\);loadSession\(\)/);
});

test('locked models keep users in the workspace and open plan controls', () => {
  assert.match(app, /function openPlanSettings\(\)/);
  assert.match(app, /function handleLockedModel\(name\)[\s\S]*?openPlanSettings\(\)/);
  assert.match(app, /onclick="openPlanSettings\(\)">Plans/);
  assert.match(app, /Upgrade or compare plans/);
});

test('streaming replies do not erase a new draft typed while waiting', () => {
  assert.match(app, /if\(promptEl&&promptEl\.value\.trim\(\)===originalText\)promptEl\.value=''/);
  assert.match(app, /if\(promptEl&&!promptEl\.value\.trim\(\)\)promptEl\.value=originalText/);
  assert.doesNotMatch(app, /finally\{[^}]*\$\('prompt'\)\.value=''/);
});

test('pinned chats must be unpinned before deletion', () => {
  assert.match(app, /if\(current\?\.pinned\)\{setStatus\('Unpin this chat before deleting it\.'/);
  assert.match(app, /Chat pinned\. Unpin it before deleting\./);
});

test('owner-only controls are hidden by default and revealed only by server owner state', () => {
  assert.match(app, /class="settings-row owner-only" hidden/);
  assert.match(app, /class="owner-only" hidden aria-label="Open Roblox Studio coding agent"/);
  assert.match(app, /const visible=isOwner\(\)/);
  assert.match(app, /el\.hidden=!visible/);
});

test('landing support action uses a real directional affordance', () => {
  assert.match(landing, /Ask support ↗/);
  assert.doesNotMatch(landing, /Ask support \?/);
});
