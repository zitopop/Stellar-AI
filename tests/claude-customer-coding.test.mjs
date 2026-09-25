import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanTask } from '../lib/desktop-agent-handler.js';
import { validate } from '../lib/desktop-plan-handler.js';

const policy={read:true,write:true,shell:false,openUrl:false};
const patch={type:'apply_patch',args:{path:'src/main.js',find:'return 1;',replace:'return 2;'},approved:true};

test('precise patches require both account write permission and explicit approval',()=>{
  assert.equal(cleanTask(policy,patch).type,'apply_patch');
  assert.throws(()=>cleanTask({...policy,write:false},patch),/Write access is disabled/);
  assert.throws(()=>cleanTask(policy,{...patch,approved:false}),/explicit approval/);
  assert.throws(()=>cleanTask(policy,{...patch,args:{...patch.args,find:''}}),/exact existing text/);
  assert.throws(()=>cleanTask(policy,{...patch,args:{...patch.args,path:'.env.local'}}),/blocked/);
});

test('inspection cannot escalate to edits through a model response',()=>{
  assert.throws(()=>validate({phase:'implement',actions:[patch]},'inspect'),/Inspection must not/);
  const plan=validate({phase:'implement',actions:[{type:'read_file',args:{path:'package.json'}}]},'inspect');
  assert.equal(plan.phase,'inspect');
  assert.equal(plan.actions[0].requiresApproval,false);
});

test('review results never grant approval and may finish without more actions',()=>{
  const plan=validate({summary:'Test failed; proposed repair',actions:[{...patch,requiresApproval:false}]},'review');
  assert.equal(plan.phase,'review');
  assert.equal(plan.actions[0].requiresApproval,true);
  assert.deepEqual(validate({summary:'Verified results reviewed',actions:[]},'review').actions,[]);
});
