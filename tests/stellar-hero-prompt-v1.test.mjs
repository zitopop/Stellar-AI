import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const html = read('index.html');
const css = read('lib/assets/stellar-hero-prompt-v1.css');
const js = read('lib/assets/stellar-hero-prompt-v1.js');
const app = read('app.html');

test('real prompt is a native, accessible, progressive form that opens the existing chat draft', () => {
  assert.match(html, /<form id="stellar-hero-ask"[^>]*action="\/app" method="get"/);
  assert.match(html, /<label class="hero-ask-label" for="stellar-hero-prompt">/);
  assert.match(html, /<textarea id="stellar-hero-prompt" name="prompt"[^>]*maxlength="2000" required/);
  assert.match(html, /<input type="hidden" name="mode" value="general">/);
  assert.match(html, /<input type="hidden" name="utm_source" value="homepage">/);
  assert.match(html, /Opens as an editable draft\. You choose when to send/);
  assert.match(app, /q\.get\('prompt'\)/);
  assert.match(app, /if\(requestedMode==='debug'/);
  assert.ok(html.indexOf('stellar-hero-prompt-v1.css') > html.indexOf('stellar-landing-bold-white-v1.css'));
  assert.match(html, /stellar-hero-prompt-v1\.js\?v=20261011-1/);
  assert.doesNotMatch(js, /fetch\(|sendMessage\(|requestSubmit\(/);
});

test('all three suggestions work even with scripts disabled', () => {
  const links = [...html.matchAll(/<a class="hero-prompt-chip" href="([^"]+)" data-hero-prompt="([^"]+)" data-hero-mode="([^"]+)">([^<]+)<\/a>/g)];
  assert.equal(links.length, 3);
  assert.deepEqual(links.map(([, , , , label]) => label), ['Write something', 'Plan a project', 'Fix my code']);
  for (const [, encoded, prompt, mode] of links) {
    const url = new URL(encoded.replaceAll('&amp;', '&'), 'https://trystellarai.com');
    assert.equal(url.pathname, '/app');
    assert.equal(url.searchParams.get('prompt'), prompt);
    assert.equal(url.searchParams.get('mode'), mode);
    assert.equal(url.searchParams.get('utm_source'), 'homepage');
  }
});

function fakePage() {
  const tracked = [];
  const controls = {mode:{value:'general'}};
  const input = {
    value:'', validationMessage:'', focused:false, events:{},
    setCustomValidity(value){this.validationMessage=value},
    reportValidity(){this.didReport=true},
    focus(){this.focused=true},
    setSelectionRange(){},
    addEventListener(type, handler){this.events[type]=handler}
  };
  const form = {
    dataset:{}, events:{},
    querySelector(query){return query==='input[name="mode"]'?controls.mode:null},
    addEventListener(type, handler){this.events[type]=handler}
  };
  const chips = [
    {dataset:{heroPrompt:'Help me write a clear email.',heroMode:'general'},events:{}},
    {dataset:{heroPrompt:'Help me plan a project.',heroMode:'general'},events:{}},
    {dataset:{heroPrompt:'Help me debug my code.',heroMode:'debug'},events:{}}
  ].map(chip => ({...chip, addEventListener(type,handler){this.events[type]=handler}}));
  const preview={open:false};
  const live={events:{},addEventListener(type, handler){this.events[type]=handler}};
  const document={
    readyState:'complete',
    getElementById(id){return ({'stellar-hero-ask':form,'stellar-hero-prompt':input,'stellar-example-live':live})[id]||null},
    querySelectorAll(selector){return selector==='[data-hero-prompt]'?chips:[]},
    querySelector(selector){return selector==='#try-preview .developer-preview-collapse'?preview:null}
  };
  const window={location:{hash:''},StellarTelemetry:{track(name){tracked.push(name)}}};
  runInNewContext(js, {document,window}, {timeout:1000});
  return {form,input,mode:controls.mode,chips,preview,live,tracked};
}

test('suggestion fills the editable prompt; submitting does not auto-send', () => {
  const p=fakePage();
  let blocked=false;
  p.chips[2].events.click({preventDefault(){blocked=true}});
  assert.equal(blocked,true);
  assert.equal(p.input.value,'Help me debug my code.');
  assert.equal(p.mode.value,'debug');
  assert.equal(p.input.focused,true);
  p.form.events.submit({preventDefault(){throw Error('valid submit must use native GET')}});
  assert.ok(p.tracked.includes('landing-hero-prompt-opened'));
  p.input.value='   ';
  p.form.events.submit({preventDefault(){blocked=true}});
  assert.equal(p.input.validationMessage,'Type a question to open Stellar.');
  assert.equal(blocked,true);
  p.input.value='';
  p.input.events.input();
  assert.equal(p.mode.value,'general');
  p.live.events.click();
  assert.equal(p.preview.open,true);
  assert.ok(p.tracked.includes('landing-live-preview-opened'));
});

test('midnight composer remains legible and usable on iPhone', () => {
  assert.match(css, /background:#161a21/);
  assert.match(css, /color:#fff!important/);
  assert.match(css, /min-height:46px/);
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /textarea\{font-size:16px!important\}/);
  assert.match(css, /@media\(max-width:400px\)/);
  assert.match(html, /id="stellar-example-live" href="#try-preview"/);
  for (const id of ['example-showcase','work-tasks','plans','faq','try-preview','anonymous-preview-form'])
    assert.ok(html.includes('id="' + id + '"'), id);
  for (const tier of ['free','starter','plus','pro'])
    assert.ok(html.includes('data-plan="' + tier + '"'), tier);
});
