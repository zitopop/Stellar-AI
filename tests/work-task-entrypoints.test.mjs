import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'lib/assets/stellar-landing-clean-v1.css'), 'utf8');

test('homepage keeps everyday work available without burying developer positioning', () => {
  assert.match(index, /A smarter way to get things done\./);
  assert.match(index, /id="work-tasks"/);
  assert.match(index, /Pick a task to see how Stellar can help you get started/i);
  assert.match(index, /Opens as an editable draft/i);
  assert.match(index, /For developers/i);
  assert.match(index, /class="work-shortcuts"/);
});

test('three work examples open editable prompts in the app, with code help in the hero', () => {
  const section = index.split('id="work-tasks"')[1].split('id="plans"')[0];
  const links = [...section.matchAll(/class="work-shortcut" href="([^"]+)"/g)].map(([, raw]) => raw.replaceAll('&amp;', '&'));
  assert.equal(links.length, 3);
  for (const href of links) {
    const url = new URL(href, 'https://trystellarai.com');
    assert.equal(url.pathname, '/app');
    assert.ok(url.searchParams.get('prompt')?.length > 25, 'task has usable prompt');
    assert.equal(url.searchParams.get('utm_source'), 'homepage');
  }
  assert.match(index, /data-hero-mode="debug"/);
  assert.match(index, /Fix my code/);
  assert.match(app, /q\.get\('prompt'\)/);
});

test('work is accessible from the responsive menu', () => {
  assert.match(index, /href="#work-tasks">What you can do<\/a>/);
  assert.match(index, /class="menu-toggle"/);
  assert.match(css, /\.site-nav\.is-open\{display:flex\}/);
  assert.match(css, /@media\(max-width:560px\)/);
  assert.match(css, /:focus-visible/);
});

test('app still labels general work and debug modes clearly', () => {
  assert.match(app, /Chat &amp; work/);
  assert.match(app, /Debug code/);
});
