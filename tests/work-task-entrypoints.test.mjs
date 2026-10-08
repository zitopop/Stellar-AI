import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.html'), 'utf8');

test('homepage keeps everyday work available without burying developer positioning', () => {
  assert.match(index, /Build scripts\.<br>Find bugs\.<br>Keep creating\./);
  assert.match(index, /id="work-tasks"/);
  assert.match(index, /Write emails, plan projects/i);
  assert.match(index, /does not automatically send emails or change your files/i);
  assert.match(index, /FiveM and Roblox creators/);
  assert.match(index, /class="work-details"/);
});

test('four work examples open editable prompts in the same app', () => {
  const section = index.split('id="work-tasks"')[1].split('id="plans"')[0];
  const links = [...section.matchAll(/class="work-shortcut" href="([^"]+)"/g)].map(([, raw]) => raw.replaceAll('&amp;', '&'));
  assert.equal(links.length, 4);
  for (const href of links) {
    const url = new URL(href, 'https://trystellarai.com');
    assert.equal(url.pathname, '/app');
    assert.ok(url.searchParams.get('prompt')?.length > 25, 'task has usable prompt');
    assert.equal(url.searchParams.get('utm_source'), 'homepage');
  }
  assert.equal(new URL(links[3], 'https://trystellarai.com').searchParams.get('mode'), 'debug');
  assert.match(app, /q\.get\('prompt'\)/);
});

test('work is accessible from the responsive menu', () => {
  assert.match(index, /href="#work-tasks">Work<\/a>/);
  assert.match(index, /class="menu-toggle"/);
  assert.match(index, /\.site-nav\.is-open\{display:flex\}/);
  assert.match(index, /@media\(max-width:560px\)/);
  assert.match(index, /:focus-visible/);
});

test('app still labels general work and debug modes clearly', () => {
  assert.match(app, /Chat &amp; work/);
  assert.match(app, /Debug code/);
});
