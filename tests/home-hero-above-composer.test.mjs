import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../app.html', import.meta.url), 'utf8');

test('empty home hero sits centered directly above the centered composer', () => {
  assert.match(app, /<style id="stellar-home-hero-above-composer-v1">[\s\S]*?body\.stellar-start-state\.stellar-empty-home #chat\{[\s\S]*?left:50%!important;[\s\S]*?bottom:calc\(50dvh \+ 82px\)!important;[\s\S]*?transform:translateX\(-50%\)!important;/);
  assert.match(app, /body\.stellar-start-state\.stellar-empty-home \.landing-style-home\{[\s\S]*?align-items:center!important;[\s\S]*?justify-content:flex-end!important;[\s\S]*?text-align:center!important;/);
});

test('mobile empty home keeps the hero immediately above the composer', () => {
  assert.match(app, /@media\(max-width:640px\)\{[\s\S]*?body\.stellar-start-state\.stellar-empty-home #chat\{[\s\S]*?bottom:calc\(50dvh \+ 72px\)!important;/);
});
