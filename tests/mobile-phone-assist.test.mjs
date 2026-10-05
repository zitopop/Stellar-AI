import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const pkg = JSON.parse(readFileSync(new URL('../mobile/package.json', import.meta.url), 'utf8'));
const workflow = readFileSync(new URL('../.github/workflows/mobile-store-build.yml', import.meta.url), 'utf8');
const plugin = readFileSync(new URL('../mobile/android-control/StellarAssistPlugin.java', import.meta.url), 'utf8');
const service = readFileSync(new URL('../mobile/android-control/StellarAssistService.java', import.meta.url), 'utf8');
const config = readFileSync(new URL('../mobile/android-control/stellar_accessibility_service.xml', import.meta.url), 'utf8');
const installer = readFileSync(new URL('../mobile/android-control/apply-android-control.mjs', import.meta.url), 'utf8');

test('Android assist bridge is installed into generated Capacitor builds', () => {
  assert.equal(pkg.scripts['prepare:android-control'], 'node android-control/apply-android-control.mjs');
  assert.match(workflow, /Install Android Assist Mode/);
  assert.match(workflow, /npm run prepare:android-control/);
  assert.match(installer, /registerPlugin\(StellarAssistPlugin\.class\)/);
  assert.match(installer, /BIND_ACCESSIBILITY_SERVICE/);
});

test('Assist service is user-driven and redacts sensitive fields', () => {
  assert.match(service, /node\.isPassword\(\)/);
  assert.match(service, /\[redacted password field\]/);
  assert.match(service, /\[editable field/);
  assert.match(service, /findFocus\(AccessibilityNodeInfo\.FOCUS_INPUT\)/);
  assert.match(service, /ACTION_SET_TEXT/);
  assert.match(service, /tapExactText/);
  assert.doesNotMatch(service, /HttpURLConnection|OkHttp|WebSocket/);
  assert.match(config, /android:isAccessibilityTool="false"/);
  assert.match(config, /android:canPerformGestures="false"/);
});

test('Stellar chat exposes disclosure, consent and explicit phone actions only in native Android', () => {
  assert.match(app, /PHONE_ASSIST_CONSENT_KEY/);
  assert.match(app, /Phone Assist Mode/);
  assert.match(app, /I understand · continue/);
  assert.match(app, /Add this screen to Stellar chat/);
  assert.match(app, /Tap exact visible text/);
  assert.match(app, /Type into the field you already focused/);
  assert.match(app, /Stop Assist Mode/);
  assert.match(app, /NATIVE_PLATFORM==='android'/);
  assert.match(plugin, /Settings\.ACTION_ACCESSIBILITY_SETTINGS/);
});
