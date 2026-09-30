import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('landing uses the serious chat-first visual layer',()=>{
  assert.match(home,/stellar-serious-chat-first-v37/);
  assert.match(home,/\.public-home \.oa2-composer\{max-width:760px/);
  assert.match(home,/\.public-home \.oa2-trust-path,/);
  assert.match(home,/\.public-home \.stellar-growth-strip,/);
  assert.match(home,/display:none!important/);
});

test('core homepage conversion surfaces remain present',()=>{
  assert.match(home,/Ask anything\.<br>Get real work done\./);
  assert.match(home,/id="build-form"/);
  assert.match(home,/id="product-map"/);
  assert.match(home,/id="capabilities"/);
  assert.match(home,/id="plans"/);
  assert.match(home,/faq-section/);
  assert.match(home,/final-cta/);
});

test('landing keeps plan and Jarvis value intact',()=>{
  assert.match(home,/data-plan="free"/);
  assert.match(home,/data-plan="starter"/);
  assert.match(home,/data-plan="plus"/);
  assert.match(home,/data-plan="pro"/);
  assert.match(home,/Jarvis Voice \+ Vision/);
  assert.match(home,/Jarvis Pro briefings \+ proactive alerts/);
});
