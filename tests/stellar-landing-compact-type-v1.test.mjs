import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const compact = readFileSync(new URL('../lib/assets/stellar-landing-compact-type-v1.css', import.meta.url), 'utf8');

test('compact type applies only to landing and wins over old theme layers', () => {
  const marker = 'stellar-landing-compact-type-v1.css?v=20261011-1';
  assert.ok(home.includes(marker));
  assert.ok(home.indexOf(marker) > home.indexOf('stellar-homepage-minimal-20261011.css'));
  assert.ok(!app.includes('stellar-landing-compact-type-v1.css'));
  assert.match(compact, /\.public-home \.hero h1 \{/);
  assert.match(compact, /font-size:clamp\(31px,3\.8vw,46px\)!important/);
  assert.match(compact, /font-size:clamp\(23px,2\.5vw,31px\)!important/);
  assert.match(compact, /min-height:44px!important/);
  assert.match(compact, /@media\(max-width:620px\)/);
});
test('small letters do not change prompt, code, or subscription functionality', () => {
  assert.match(compact, /text-transform:lowercase/);
  assert.match(compact, /#anonymous-preview-result \*/);
  assert.match(compact, /text-transform:none!important/);
  assert.match(home, /id="anonymous-preview-form"/);
  assert.match(home, /id="stellar-example-panel"/);
  assert.match(home, /data-cycle="annual"/);
  for (const plan of ['free','starter','plus','pro']) {
    assert.ok(home.includes('data-plan="' + plan + '"'));
  }
});
