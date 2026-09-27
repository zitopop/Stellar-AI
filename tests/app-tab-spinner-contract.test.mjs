import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('app navigation strips eager Google identity loading to prevent a stuck tab spinner', () => {
  assert.match(sw, /stellar-sw-2026-09-27-(?:tab-spinner-v11|simple-workspace-v12)/);
  assert.match(sw, /function patchAppNavigationResponse\(request, response\)/);
  assert.match(sw, /<script src="https:\/\/accounts\.google\.com\/gsi\/client" async defer><\/script>/);
  assert.match(sw, /googleIdentityLazyLoader\(\)/);
  assert.match(sw, /window\.StellarGoogleIdentity = \{ load: loadGoogleIdentity \}/);
  assert.match(sw, /request\.mode === 'navigate'/);
  assert.match(sw, /patchAppNavigationResponse\(request, response\)/);
});
