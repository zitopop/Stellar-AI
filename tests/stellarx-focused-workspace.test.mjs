import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page=readFileSync(new URL('../desktop-agent.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../lib/assets/stellarx-chat-workspace.css',import.meta.url),'utf8');

test('StellarX presents a focused job-first workspace',()=>{
  assert.match(page,/Give <span class="agent-name">StellarX<\/span> a job/);
  assert.match(page,/What do you want done\?/);
  for(const label of ['Review','Fix','Build','Verify']) assert.match(page,new RegExp('>'+label+'<'));
  assert.match(page,/id="taskProgress"/);
  assert.match(page,/Prepare task/);
  assert.match(page,/Run approved actions/);
});

test('StellarX keeps computer control visible without neon takeover',()=>{
  assert.match(page,/Computer connection/);
  assert.match(page,/Emergency Stop/);
  assert.match(css,/\.stellar-use-led\{display:none!important\}/);
  assert.match(css,/\.stellar-use-bar\{top:56px!important/);
  assert.match(css,/task-mode-row/);
});

test('StellarX customer copy uses the current usage model',()=>{
  assert.match(page,/planning uses part of your current Stellar allowance/i);
  assert.doesNotMatch(page,/each StellarX AI planning pass costs 20 Stellar credits/i);
});
