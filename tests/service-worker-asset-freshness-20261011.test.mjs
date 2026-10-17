import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const serviceWorkerSource = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

function makeFetchHarness(destination, online = true) {
  const listeners = new Map();
  const pending = [];
  const requests = [];
  const cached = { source: 'cached' };
  const fresh = { source: 'network', ok: true, type: 'basic', clone() { return this; } };
  const writes = [];

  const self = {
    location: { origin: 'https://trystellarai.com' },
    addEventListener: (name, handler) => listeners.set(name, handler),
  };
  const caches = {
    match: async () => cached,
    open: async () => ({ put: async (request, response) => writes.push({ request, response }) }),
  };
  const fetch = async (request, options) => {
    requests.push({ request, options });
    if (!online) throw new Error('Offline');
    return fresh;
  };
  runInNewContext(serviceWorkerSource, {
    self, caches, fetch, URL,
    Response: { error: () => ({ source: 'error' }) },
  });

  const request = {
    method: 'GET',
    destination,
    mode: 'cors',
    url: 'https://trystellarai.com/lib/assets/current.' + (destination === 'style' ? 'css' : 'js'),
  };
  let responsePromise;
  listeners.get('fetch')({
    request,
    respondWith: (value) => { responsePromise = value; },
    waitUntil: (value) => { pending.push(value); },
  });
  return { cached, fresh, writes, requests, pending, response: responsePromise };
}

test('installed PWA serves fresh scripts and styles on the first online visit', async () => {
  for (const destination of ['script', 'style']) {
    const run = makeFetchHarness(destination);
    assert.equal(await run.response, run.fresh, destination + ' should not serve stale cached source');
    assert.equal(run.requests.length, 1);
    assert.equal(run.writes.length, 1, 'the successful response is saved for offline use');
  }
});

test('installed PWA still serves last saved script and style when offline', async () => {
  for (const destination of ['script', 'style']) {
    const run = makeFetchHarness(destination, false);
    assert.equal(await run.response, run.cached, destination + ' must keep offline fallback');
  }
});

test('image caching remains fast with revalidation in the background', async () => {
  const run = makeFetchHarness('image');
  assert.equal(await run.response, run.cached);
  await Promise.all(run.pending);
  assert.equal(run.requests.length, 1);
  assert.equal(run.writes.length, 1);
});

test('release bumps the service-worker cache version', () => {
  assert.match(serviceWorkerSource, /stellar-sw-2026-10-11-fresh-assets-v4/);
});
