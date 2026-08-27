import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appHtml = await readFile(new URL('../app.html', import.meta.url), 'utf8');

test('pricing cards retain all four plans and checkout actions', () => {
  for (const plan of ['free', 'starter', 'plus', 'pro']) {
    assert.match(appHtml, new RegExp(`id="plan-card-${plan}" class="plan-card"`));
  }
  for (const action of ["checkout('starter')", "checkout('starter-annual')", "checkout('plus')", "checkout('plus-annual')", "checkout('pro')", "checkout('pro-annual')"]) {
    assert.match(appHtml, new RegExp(action.replace(/[()']/g, '\\$&')));
  }
});

test('pricing cards expose shared alignment rows', () => {
  assert.equal((appHtml.match(/class="plan-head-name"/g) || []).length, 4);
  assert.equal((appHtml.match(/class="plan-head-price"/g) || []).length, 4);
  assert.equal((appHtml.match(/class="plan-head-per"/g) || []).length, 4);
  assert.equal((appHtml.match(/class="plan-fit-line plan-head-fit"/g) || []).length, 4);
  assert.equal((appHtml.match(/class="plan-features"/g) || []).length, 4);
  assert.match(appHtml, /class="plan-annual-spacer" aria-hidden="true"/);
});

test('pricing alignment uses equal desktop heights with a mobile fallback', () => {
  assert.match(appHtml, /Pricing alignment: shared baselines and equal-height plan cards/);
  assert.match(appHtml, /#plans-grid-inner > \.plan-card \{[\s\S]*?min-height: 480px !important;[\s\S]*?height: 100% !important;/);
  assert.match(appHtml, /@media \(max-width: 767px\) \{[\s\S]*?#plans-grid-inner > \.plan-card \{ min-height: 0 !important; height: auto !important; \}/);
});
