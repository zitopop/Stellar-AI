import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('chat parser only appends string response chunks', () => {
  assert.match(app, /function replyTextValue\(value\)\{if\(typeof value==='string'\)return value;/);
  assert.match(app, /function eventReplyText\(ev\)/);
  assert.match(app, /ev\?\.type==='response\.output_text\.delta'/);
  assert.doesNotMatch(app, /out\+=ev\?\.delta\?\.text\|\|ev\?\.delta\|\|/);
});

test('chat parser cannot stringify event objects as object Object', () => {
  assert.doesNotMatch(app, /String\(ev\?\.delta\)/);
  assert.doesNotMatch(app, /\+ev\?\.delta/);
  assert.match(app, /out\+=eventReplyText\(ev\)/);
});
