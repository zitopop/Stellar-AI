import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=read('desktop-agent.html');
const installer=read('desktop-agent/install-windows.ps1');
const companion=read('desktop-agent/agent.mjs');
const bridge=read('lib/desktop-agent-handler.js');
const planner=read('lib/desktop-plan-handler.js');

test('StellarX connection setup is visible in PC mode with one copied command',()=>{
  for(const id of ['stellarxQuickConnect','pairBtn','copySetupBtn','quickInstallCommand','setupStatus','restartHint']){
    assert.match(page,new RegExp('id="'+id+'"'));
  }
  assert.match(page,/oneCommandSetup\(code\)/);
  assert.match(page,/Create connection code/);
  assert.match(page,/Copy Windows setup command/);
  assert.match(page,/-PairCode '\$\{clean\}' -Start/);
  assert.match(page,/body\.sx-chat-mode #stellarxQuickConnect\{display:none!important\}/);
  assert.match(page,/\$\('copySetupBtn'\)\.disabled=false/);
  assert.match(page,/\$\('stellarxQuickConnect'\)\.hidden=!!d\.online/);
});

test('installer pairs and launches the local companion without enabling shell',()=>{
  assert.match(installer,/ValidatePattern\('\^\[a-fA-F0-9\]\{16\}\$'\)/);
  assert.match(installer,/\[switch\]\$Start/);
  assert.match(installer,/& node \(Join-Path \$InstallDir "agent\.mjs"\) pair \$PairCode/);
  assert.match(installer,/& node \(Join-Path \$InstallDir "agent\.mjs"\) run/);
  assert.match(installer,/STELLAR_DESKTOP_ALLOW_SHELL=0/);
  assert.match(installer,/StellarX PC Agent\.lnk/);
  assert.match(installer,/Read-Host "Install the free Node\.js LTS/);
  assert.doesNotMatch(installer,/schtasks|New-Service|CurrentVersion\\Run/);
});

test('CMD and PowerShell are distinct, explicitly approved terminal choices',()=>{
  assert.match(bridge,/Choose CMD or PowerShell for terminal commands/);
  assert.match(planner,/shell must be 'cmd' \(default\) or 'powershell'/);
  assert.match(companion,/shell==='powershell'\?'powershell\.exe':'cmd\.exe'/);
  assert.match(companion,/spawn\(program,args,\{cwd,shell:false/);
  assert.match(companion,/if\(!ALLOW_SHELL\)/);
  assert.match(companion,/if\(task\.approved!==true\)/);
  assert.match(bridge,/if\(type==='run_command'&&policy\.shell!==true\)/);
});
