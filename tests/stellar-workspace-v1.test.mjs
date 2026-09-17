import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../app.html', import.meta.url), 'utf8');
const client = await readFile(new URL('../stellar-workspace.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../stellar-workspace.css', import.meta.url), 'utf8');
const api = await readFile(new URL('../api/workspace.js', import.meta.url), 'utf8');
const search = await readFile(new URL('../api/search.js', import.meta.url), 'utf8');

test('workspace layer is loaded after the stable Orbit assets', () => {
  assert.match(app, /stellar-workspace\.css\?v=1/);
  assert.match(app, /stellar-workspace\.js\?v=1/);
});

test('workspace enhancement remains event driven and does not add mutation observers', () => {
  assert.doesNotMatch(client, /MutationObserver/);
  assert.match(client, /DOMContentLoaded/);
  assert.match(client, /setTimeout\(\(\) => loadRemote/);
});

test('composer exposes Chat Search and Research modes plus attach tools', () => {
  assert.match(client, /allowedModes = new Set\(\['chat', 'search', 'research'\]\)/);
  assert.match(client, /data-tool=\\"image\\"/);
  assert.match(client, /data-tool=\\"files\\"/);
  assert.match(client, /data-tool=\\"voice\\"/);
});

test('signed-in workspace stores projects and explicit memories server side', () => {
  assert.match(api, /requireSession/);
  assert.match(api, /stellar:workspace:/);
  assert.match(api, /projects/);
  assert.match(api, /memories/);
  assert.match(api, /memoryEnabled/);
});

test('research mode asks search provider for a larger bounded result set', () => {
  assert.match(search, /mode === 'research' \? 16 : 8/);
  assert.match(search, /query.*slice\(0, 240\)/s);
});

test('workspace UI preserves mobile bottom-sheet behavior and touch-sized controls', () => {
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /min-height:44px/);
  assert.match(css, /safe-area-inset-bottom/);
});
