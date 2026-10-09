import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const jarvis = readFileSync(new URL('../jarvis-workspace.html', import.meta.url), 'utf8');
const plugins = readFileSync(new URL('../plugins.html', import.meta.url), 'utf8');

test('Jarvis can stop a streaming reply and keeps owner permission checks', () => {
  assert.match(jarvis, /id="stop-response"/);
  assert.match(jarvis, /new AbortController\(\)/);
  assert.match(jarvis, /signal:requestController\.signal/);
  assert.match(jarvis, /pendingController\.abort\(\)/);
  assert.match(jarvis, /jarvisSource='jarvis-owner'/);
  assert.match(jarvis, /fetch\('\/api\/get-plan'/);
});

test('Jarvis recovers a failed request without losing the unsent prompt', () => {
  assert.match(jarvis, /messages\.pop\(\);userBubble\.closest/);
  assert.match(jarvis, /\$\('prompt'\)\.value=text;resizePrompt\(\)/);
  assert.match(jarvis, /id="retry-access"/);
  assert.match(jarvis, /syncJarvisAccess\(\)/);
});

test('Jarvis does not re-open the microphone after cancelled speech', () => {
  assert.match(jarvis, /speechRunId\+\+/);
  assert.match(jarvis, /if\(runId!==speechRunId\)return/);
  assert.match(jarvis, /if\(runId===speechRunId\)startListening\(\)/);
});

test('Plugin connections are account-scoped, with recoverable loading errors', () => {
  assert.match(plugins, /plugin\.connected===true&&plugin\.status!=='coming_soon'/);
  assert.match(plugins, /id="retry-directory"/);
  assert.match(plugins, /retryDirectory\?\.addEventListener\('click',loadConnectedApps\)/);
  assert.match(plugins, /id="plugin-account-grid"/);
  assert.match(plugins, /pluginApi\('disconnect',\{id\}\)/);
  assert.match(plugins, /pluginApi\('startOAuth',\{id\}\)/);
});

test('Developer-token connection is reversible and does not store secrets in the page', () => {
  assert.match(plugins, /type='password'/);
  assert.match(plugins, /pluginApi\('connectToken',\{id,token\}\)/);
  assert.doesNotMatch(plugins, /localStorage\.setItem\(['"]plugin-token/);
});
