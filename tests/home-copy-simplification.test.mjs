import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appHtml = await readFile(new URL('../app.html', import.meta.url), 'utf8');

const conciseLabels = [
  'Police job',
  'Drug system',
  'Bank heist',
  'Mechanic job',
  'Roblox pack',
  'Fix Roblox code',
  'Fix script',
];

test('home suggestions use concise core-action labels in both render paths', () => {
  for (const label of conciseLabels) {
    assert.equal((appHtml.match(new RegExp(`<span>${label}</span>`, 'g')) || []).length, 2, `${label} should appear in both home render paths`);
  }
});

test('home suggestions preserve their underlying generation prompts', () => {
  for (const prompt of [
    'QBCore police job with F6 menu, handcuffing, MDT and jail timer',
    'QBCore drug system with weed, coke, dealers and police alerts',
    'QBCore bank heist with planning stage, execution and police dispatch',
    'QBCore mechanic job with repair, vehicle inspection and garage system',
    'Roblox Build Pack:',
    'Roblox Fix & Review:',
    'Fix this broken script:',
  ]) assert.match(appHtml, new RegExp(`useSuggestion\\('${prompt.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}`));
});

test('the redundant ready-to-build helper is removed from the home screen', () => {
  assert.doesNotMatch(appHtml, /id="starter-ready"/);
  assert.doesNotMatch(appHtml, />Ready to build\. Review the prompt, then press Send\.<\/span>/);
});
