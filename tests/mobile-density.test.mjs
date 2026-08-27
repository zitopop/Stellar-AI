import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appHtml = await readFile(new URL('../app.html', import.meta.url), 'utf8');

test('mobile home screen uses a compact first-build rhythm', () => {
  assert.match(appHtml, /#chat > \.greet-wrap \{\s+padding: 12px 10px 10px !important;/);
  assert.match(appHtml, /#chat > \.greet-wrap \.welcome-sub \{\s+margin-top: 4px !important;/);
  assert.match(appHtml, /#chat > \.greet-wrap \.welcome-next-step \{\s+margin-top: 7px !important;/);
  assert.match(appHtml, /#chat > \.greet-wrap \.welcome-starters-label \{\s+margin-top: 11px !important;\s+margin-bottom: 4px !important;/);
  assert.match(appHtml, /#chat > \.greet-wrap #suggestion-chips \{\s+gap: 5px !important;\s+margin-top: 5px !important;/);
  assert.match(appHtml, /#chat > \.greet-wrap \.sug-chip \{\s+min-height: 43px !important;/);
});

test('Settings account email remains on one line on narrow screens', () => {
  assert.match(appHtml, /#settings-modal #set-email-row \{\s+min-width: 0 !important;/);
  assert.match(appHtml, /#settings-modal #set-email \{[\s\S]*?overflow: hidden !important;[\s\S]*?text-overflow: ellipsis !important;[\s\S]*?white-space: nowrap !important;/);
  assert.match(appHtml, /#settings-modal a\[href\^="mailto:"\] \{[\s\S]*?white-space: nowrap !important;/);
});
