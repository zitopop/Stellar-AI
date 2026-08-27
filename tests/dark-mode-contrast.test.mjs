import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appHtml = await readFile(new URL('../app.html', import.meta.url), 'utf8');

test('dark-only Look controls use readable neutral and emerald states', () => {
  assert.match(appHtml, /body:not\(\.light\) #settings-modal \.seg,\s+body:not\(\.light\) #settings-modal \.seg\.on,\s+body:not\(\.light\) #settings-modal \.seg\.active/);
  assert.match(appHtml, /background: #1a1c22 !important;\s+color: #d7dae2 !important;/);
  assert.match(appHtml, /body:not\(\.light\) #settings-modal \.seg\.on,[\s\S]*?background: linear-gradient\(180deg, #1f6e5b, #145342\) !important;/);
  assert.match(appHtml, /body:not\(\.light\) #settings-modal \.set-note[\s\S]*?color: #b7bac4 !important;/);
});

test('dark-only workspace keeps its body background and never needs a light theme state', () => {
  assert.match(appHtml, /html, body \{ background: #07070a !important; color: #f4f4f5 !important; \}/);
  assert.match(appHtml, /function setMode\(mode = 'dark', source = 'dark-only'\)/);
  assert.match(appHtml, /document\.body\.classList\.remove\('light'\);/);
  assert.match(appHtml, /Store\.set\(\{ mode: 'dark' \}\);/);
});
