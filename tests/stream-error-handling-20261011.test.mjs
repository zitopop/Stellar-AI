import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const stellarx = readFileSync(new URL('../lib/assets/stellarx-conversation.js', import.meta.url), 'utf8');

const appStart = app.indexOf('function parseStellarStreamEvent(payload){');
const appEnd = app.indexOf('// Refresh an expired session once', appStart);
assert.ok(appStart >= 0 && appEnd > appStart, 'current main chat stream handler exists');
const appHandlers = new Function('eventReplyText', app.slice(appStart, appEnd) + '\nreturn {parseStellarStreamEvent,streamReply};')(
  event => event?.delta?.text || '',
);

const sxStart = stellarx.indexOf('function parseEvent(raw){');
const sxEnd = stellarx.indexOf('async function sendChat(text){', sxStart);
assert.ok(sxStart >= 0 && sxEnd > sxStart, 'StellarX stream handler exists');
const parseStellarx = new Function(stellarx.slice(sxStart, sxEnd) + '\nreturn parseEvent;')();

test('main chat propagates provider errors after HTTP 200 instead of swallowing them', () => {
  assert.throws(
    () => appHandlers.parseStellarStreamEvent(JSON.stringify({type:'error',error:{message:'upstream failed'}})),
    /provider interrupted the response/i,
  );
  assert.equal(appHandlers.parseStellarStreamEvent('invalid json'), '');
  assert.equal(appHandlers.parseStellarStreamEvent(JSON.stringify({type:'content_block_delta',delta:{text:'hello'}})), 'hello');
});

test('main chat forwards valid chunks before stopping on a streamed error', async () => {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('data: {"type":"content_block_delta","delta":{"text":"Hello"}}\n\n'));
      controller.enqueue(encoder.encode('data: {"type":"error","error":{"message":"unavailable"}}\n\n'));
      controller.close();
    },
  });
  const received = [];
  await assert.rejects(
    appHandlers.streamReply({body}, delta => received.push(delta)),
    /provider interrupted the response/i,
  );
  assert.deepEqual(received, ['Hello']);
});

test('StellarX chat propagates model errors without exposing raw provider messages', () => {
  assert.throws(() => parseStellarx(JSON.stringify({type:'error',error:{message:'credential detail'}})), /provider interrupted the response/i);
  assert.equal(parseStellarx('{bad json'), '');
  assert.equal(parseStellarx(JSON.stringify({type:'content_block_delta',delta:{type:'text_delta',text:'All good'}})), 'All good');
});
