import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const landing = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('returning model preference waits for server plan truth before use', () => {
  assert.match(app, /safeStorageGet\('stellar-selected-model','star'\)/);
  assert.match(app, /await loadPlanTruth\(\)/);
  assert.match(app, /if\(!allowedModels\.includes\(selectedModel\)\)selectedModel=/);
  assert.match(app, /safeStorageSet\('stellar-selected-model',selectedModel\)/);
});

test('locked models stay in the workspace without silently activating', () => {
  assert.match(app, /if\(!allowedModels\.includes\(m\)\)\{setStatus\('Locked on this plan','warn'\);return\}/);
  assert.match(app, /data-open="plans"/);
});

test('a new draft typed while a reply is pending is not cleared after generation', () => {
  assert.match(app, /prompt\.value='';resizePrompt\(\);setGenerating\(true\);setStatus\('Thinking…','warn'\)/);
  assert.doesNotMatch(app, /finally\{[^}]*prompt\.value=''/);
  assert.match(app, /finally\{currentGenerationController=null;setGenerating\(false\);/);
});

test('clean chat shell does not expose stale owner-only controls', () => {
  assert.doesNotMatch(app, /owner-only/);
  assert.match(app, /serverOwner=data\.owner===true\|\|account\.owner===true/);
});

test('landing keeps a real support route', () => {
  assert.match(landing, /href="\/support"/);
});
