import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const chat = readFileSync(new URL('../api/chat.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../lib/assets/stellar-premium-foundations-20261011.css', import.meta.url), 'utf8');

test('Stellar Smart is the default for new visitors and explicitly selectable', () => {
  assert.match(app, /selectedModel=safeModel\(safeStorageGet\('stellar-selected-model','auto'\)\)/);
  assert.match(app, /const MODELS=\{auto:'Stellar Smart'/);
  assert.match(app, /order=\['auto','spark','star','comet','nova'\]/);
  assert.match(app, /key==='auto'\|\|allowedModels\.includes\(key\)/);
  assert.match(chat, /'spark', 'star', 'comet', 'nova', 'auto'/);
  assert.match(chat, /selectSmartTier\(\{ messages: cleanMessages, plan, requestKind, workflowMode \}\)/);
});

test('chat retries only unauthorised responses, following a session refresh', () => {
  assert.match(app, /let res=await chatRequest\(\);if\(res\.status===401&&token\(\)/);
  assert.match(app, /if\(await refreshSession\(\)\)res=await chatRequest\(\)/);
  assert.match(app, /if\(!res\.ok\)\{/);
});

test('premium styling remains presentation-only and retains core chat controls', () => {
  assert.match(app, /stellar-premium-foundations-20261011\.css/);
  assert.match(css, /\.side-primary/);
  assert.match(css, /\.side-history/);
  assert.match(css, /\.side-new-chat/);
  assert.match(css, /\.composer-model-picker/);
  assert.doesNotMatch(css, /MutationObserver|setInterval|localStorage|\.chatForm\s*\{\s*display:\s*none/i);
});
