import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../desktop-agent.html',import.meta.url),'utf8');

test('StellarX has one primary task and a simple Start task action',()=>{
  assert.match(page, /stellarx-simple-layout-v1/);
  assert.match(page, /id="taskComposer"/);
  assert.match(page, /document\.getElementById\('planBtn'\)\.textContent='Start task/);
  assert.match(page, /composer\.insertBefore\(examples,progress\)/);
  assert.match(page, /extra\.className='stellarx-advanced'/);
  assert.match(page, /extra\.append\(heading\)/);
  assert.match(page, /body\.stellarx-simple \.codex-sidebar\{display:none!important\}/);
  assert.match(page, /body\.stellarx-simple \.planning-note\{display:none!important\}/);
});

test('safe inspection runs automatically but writes still require explicit checkbox approval',()=>{
  assert.match(page, /const safeRead=new Set\(\['read_file','list_directory','search_files','git_status','git_diff'\]\)/);
  assert.match(page, /a\.requiresApproval!==true&&safeRead\.has\(a\.type\)/);
  assert.match(page, /await \$\('runBtn'\)\.onclick\(\)/);
  assert.match(page, /check\.checked=!action\.requiresApproval/);
  assert.match(page, /type='checkbox'/);
  assert.match(page, /approved:true/);
  assert.match(page, /Emergency Stop/);
});

test('errors remain visible outside collapsed activity log',()=>{
  assert.match(page, /id='stellarxSimpleNotice'/);
  assert.match(page, /cls==='bad'\|\|cls==='warn'/);
  assert.match(page, /notice\.hidden=false;notice\.textContent=message/);
});
