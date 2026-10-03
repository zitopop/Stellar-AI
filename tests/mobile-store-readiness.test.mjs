import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
const mobilePackage = JSON.parse(readFileSync(new URL('../mobile/package.json', import.meta.url), 'utf8'));
const mobileConfig = readFileSync(new URL('../mobile/capacitor.config.ts', import.meta.url), 'utf8');
const mobileReadme = readFileSync(new URL('../mobile/README.md', import.meta.url), 'utf8');

test('PWA stays installable and opens the Stellar workspace', () => {
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/app?source=pwa');
  assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512'));
});

test('native mobile shell uses current Capacitor 8 and an HTTPS production origin', () => {
  assert.equal(mobilePackage.dependencies['@capacitor/core'], '8.5.2');
  assert.equal(mobilePackage.devDependencies['@capacitor/ios'], '8.5.2');
  assert.equal(mobilePackage.devDependencies['@capacitor/android'], '8.5.2');
  assert.match(mobileConfig, /appId: 'com\.trystellarai\.stellar'/);
  assert.match(mobileConfig, /https:\/\/trystellarai\.com\/app\?source=native/);
  assert.match(mobileConfig, /cleartext: false/);
});

test('mobile release notes protect against premature store submission', () => {
  assert.match(mobileReadme, /Do not submit the current remote-web test shell directly to App Store production/);
  assert.match(mobileReadme, /Apple requires apps to provide value beyond a repackaged website/);
  assert.match(mobileReadme, /Web Stripe checkout must not simply be assumed to be acceptable/);
});
