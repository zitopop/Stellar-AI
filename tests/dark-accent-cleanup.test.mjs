import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appHtml = await readFile(new URL('../app.html', import.meta.url), 'utf8');

test('dark app shell removes the legacy purple edge accent', () => {
  assert.match(appHtml, /body:not\(\.light\) #main-col \{[\s\S]*?background: #0b0d11 !important;[\s\S]*?border-left: 0 !important;[\s\S]*?outline: 0 !important;/);
  assert.match(appHtml, /body:not\(\.light\) \.sidebar-item\.active \{[\s\S]*?border-left-color: #61e6bf !important;/);
});

test('dark Settings terms link has no browser-blue underline', () => {
  assert.match(appHtml, /body:not\(\.light\) #settings-modal \.set-item,\s+body:not\(\.light\) #settings-modal \.set-item a,[\s\S]*?text-decoration: none !important;/);
  assert.match(appHtml, /#settings-modal \.set-item\[href="\/terms\.html"\] \{[\s\S]*?color: #e7eaf0 !important;[\s\S]*?text-decoration: none !important;/);
  assert.match(appHtml, /#settings-modal \.set-item\[href="\/terms\.html"\] \.set-chev \{[\s\S]*?color: #8fe8cf !important;/);
});
