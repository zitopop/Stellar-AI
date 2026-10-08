import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const menu = fs.readFileSync(path.join(root, 'lib/assets/homepage.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'lib/assets/stellar-work-home.css'), 'utf8');

test('homepage explains everyday work and game coding without claiming unattended actions', () => {
  assert.match(index, /Build scripts\. Get work done\./);
  assert.match(index, /id="work-tasks"/);
  assert.match(index, /write emails, plan projects/);
  assert.match(index, /does not automatically send emails or change your files/);
  assert.match(index, /FiveM and Roblox/);
});

test('each example opens a valid editable prompt in Stellar chat', () => {
  const section = index.split('id="work-tasks"')[1].split('id="capabilities"')[0];
  const links = [...section.matchAll(/class="stellar-work-shortcut" href="([^"]+)"/g)].map(([, raw]) => raw.replaceAll('&amp;', '&'));
  assert.equal(links.length, 4);
  for (const href of links) {
    const url = new URL(href, 'https://trystellarai.com');
    assert.equal(url.pathname, '/app');
    assert.ok(url.searchParams.get('prompt')?.length > 25, 'task has usable prompt');
    assert.equal(url.searchParams.get('utm_source'), 'homepage');
  }
  assert.equal(new URL(links[3], 'https://trystellarai.com').searchParams.get('mode'), 'debug');
  assert.match(app, /q\.get\('prompt'\)/);
  assert.match(app, /prompt\.value=prefill\.slice\(0,8000\)/);
});

test('work links are in desktop and mobile menus and responsive styles', () => {
  assert.match(index, /href="#work-tasks">Work<\/a>/);
  assert.match(menu, /href="#work-tasks">Work<\/a>/);
  assert.match(css, /max-width:640px/);
  assert.match(css, /focus-visible/);
  assert.match(index, /stellar-compare-reveal/);
});

test('app labels general mode for work and keeps debugging', () => {
  assert.match(app, /Chat &amp; work/);
  assert.match(app, /Debug code/);
  assert.match(app, /Writing, planning, coding and files/);
});