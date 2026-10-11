import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const landing = read('index.html');
const app = read('app.html');
const white = read('lib/assets/stellar-landing-bold-white-v1.css');

test('Stellar homepage loads crisp bold white styling last', () => {
  const newer = '/lib/assets/stellar-landing-bold-white-v1.css?v=20261011-1';
  assert.ok(landing.includes(newer));
  assert.ok(landing.indexOf(newer) > landing.indexOf('stellar-landing-compact-type-v1.css'));
  assert.ok(!app.includes('stellar-landing-bold-white-v1.css'));
  assert.match(white, /color:#ffffff!important/);
  assert.match(white, /font-weight:780!important/);
  assert.match(white, /\.public-home \.hero h1/);
  assert.match(white, /\.public-home \.plan \.price/);
  assert.match(white, /\.public-home \.footer-links>a/);
});

test('contrasting primary buttons and preserved working controls', () => {
  assert.match(white, /\.public-home \.button-primary/);
  assert.match(white, /color:#0b0d12!important/);
  assert.match(white, /#anonymous-preview-result \*/);
  for(const id of ['example-showcase','work-tasks','plans','try-preview','faq','anonymous-preview-form'])
    assert.ok(landing.includes('id="' + id + '"'), id);
  for(const plan of ['free','starter','plus','pro'])
    assert.ok(landing.includes('data-plan="' + plan + '"'), plan);
  assert.match(landing, /data-cycle="annual"/);
});
