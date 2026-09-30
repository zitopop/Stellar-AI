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


test('landing ships only the customer-facing conversion journey',()=>{
  const html=home;
  for(const stale of [
    'oa2-trust-path container',
    'oa2-business-first container',
    'oa2-delivery container',
    'stellar-proof container',
    'oa2-section container oa2-how',
    'oa2-feature container',
    'oa2-section container oa2-guides',
    'oa2-section container oa2-business',
    'stellar-growth-strip'
  ]) assert.doesNotMatch(html,new RegExp('class="' + stale + '"'));
  for(const stale of ['stellar-plan-table-wrap','oa2-plan-compare','pricing-foot']) assert.doesNotMatch(html,new RegExp('class="' + stale + '"'));
  for(const live of ['oa2-hero container','oa2-audience container','oa2-preview container','section container pricing-section','section container faq-section','container final-cta'])
    assert.match(html,new RegExp('class="' + live + '"'));
});
