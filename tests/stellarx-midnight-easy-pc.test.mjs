import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const page=readFileSync(new URL('../desktop-agent.html',import.meta.url),'utf8');
const theme=readFileSync(new URL('../lib/assets/stellarx-midnight-20261011.css',import.meta.url),'utf8');

test('StellarX desktop uses the latest monochrome Midnight theme',()=>{
  const path='/lib/assets/stellarx-midnight-20261011.css?v=1';
  assert.ok(page.includes(path));
  assert.ok(page.indexOf(path)>page.indexOf('/lib/assets/stellarx-refined.css'));
  assert.match(theme,/--sx-page:#090a0c/);
  assert.match(theme,/background:#eceef1!important/);
  assert.doesNotMatch(theme,/#8B5CF6|#A78BFA|#bca8ff/i);
});

test('Windows setup begins with one clear action and a clipboard fallback',()=>{
  assert.match(page,/id="pairBtn" type="button">Connect my PC/);
  assert.match(page,/id="copySetupBtn" type="button" disabled>Copy setup command/);
  assert.match(page,/const command=oneCommandSetup\(d.code\)/);
  assert.match(page,/try\{await copyText\(command\);copied=true;\}catch\{\}/);
  assert.match(page,/copied\?'Setup copied!/);
  assert.match(page,/Open PowerShell/);
});

test('Windows pairing retains safety approvals and an emergency stop',()=>{
  assert.match(page,/api\('createPair'\)/);
  assert.match(page,/id="permShell"/);
  assert.match(page,/id="permInput"/);
  assert.match(page,/id="savePolicyBtn"/);
  assert.match(page,/id="stopBtn"/);
});
