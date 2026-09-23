import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const jarvis = fs.readFileSync(new URL('../jarvis.html', import.meta.url), 'utf8');
const vercel = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));

test('app exposes routed Stellar Voice and Vision workspace', () => {
  assert.match(app, /id="jarvis-nav"[^>]*href="\/jarvis"[^>]*aria-label="Open Stellar Voice and Vision"/);
  assert.match(app, />Voice \/ Vision<\/a>/);
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
  assert.ok(vercel.rewrites.some((route) => route.source === '/jarvis' && route.destination === '/jarvis.html'));
  const permission = vercel.headers.flatMap((entry) => entry.headers || []).find((entry) => entry.key === 'Permissions-Policy');
  assert.equal(permission?.value, 'camera=(self), geolocation=(), payment=()');
});
