import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const jarvis = fs.readFileSync(new URL('../jarvis.html', import.meta.url), 'utf8');
const vercel = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));

test('Jarvis stays private in the app while its routes remain available to the owner', () => {
  assert.match(app, /<a class="settings-row owner-only" hidden data-settings-advanced href="\/jarvis">/);
  assert.match(app, /<strong>Jarvis<\/strong><small>Private owner assistant, missions and calls<\/small>/);
});

test('Jarvis Vision has local camera hand controls plus pointer fallback', () => {
  assert.match(jarvis, /navigator\.mediaDevices\.getUserMedia/);
  assert.match(jarvis, /HandLandmarker/);
  assert.match(jarvis, /Pinch \+ move · drag/);
  assert.match(jarvis, /pointerdown/);
  assert.match(jarvis, /Peace · reset/);
  assert.match(jarvis, /Mouse \+ touch supported/);
  assert.doesNotMatch(jarvis, /OWNER_PHONE|TWILIO_AUTH_TOKEN|API_KEY/);
});

test('deployment routes Jarvis and limits camera permission to same origin', () => {
  assert.ok(vercel.rewrites.some((route) => route.source === '/jarvis' && route.destination === '/jarvis-workspace.html'));
  assert.ok(vercel.rewrites.some((route) => route.source === '/jarvis/vision' && route.destination === '/jarvis.html'));
  const permission = vercel.headers.flatMap((entry) => entry.headers || []).find((entry) => entry.key === 'Permissions-Policy');
  assert.equal(permission?.value, 'camera=(self), geolocation=(), payment=()');
});
