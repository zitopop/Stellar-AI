import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('chat polish keeps a wider readable conversation and composer', () => {
  assert.match(app, /id="stellar-chat-polish-v39"/);
  assert.match(app, /width:min\(840px,100%\)/);
  assert.match(app, /font-size:15\.5px/);
  assert.match(app, /min-height:64px/);
});

test('Gaming AI mode labels the chat clearly', () => {
  assert.match(app, /document\.title='Stellar Gaming AI'/);
  assert.match(app, /brand\.textContent='Gaming AI'/);
  assert.match(app, /Ask Gaming AI about your server, script or error/);
});

test('homepage gives pricing more space and keeps clear conversion actions', () => {
  assert.match(home, /id="stellar-home-scale-v39"/);
  assert.match(home, /width:min\(1240px,calc\(100% - 36px\)\)/);
  assert.match(home, /\.plan\{padding:28px!important;min-height:500px!important/);
  assert.match(home, /\.oa2-hero-actions\{display:flex!important/);
  assert.match(home, /href="\/app\?mode=gaming">Gaming AI<\/a>/);
});
