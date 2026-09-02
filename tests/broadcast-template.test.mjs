import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const broadcastTemplate = readFileSync(new URL('../archive/templates/broadcast-template.html', import.meta.url), 'utf8');

test('the unsent broadcast template keeps the required Stellar AI Team signature', () => {
  assert.match(broadcastTemplate, /<strong>— The Stellar AI Team 🚀<\/strong>/);
  assert.match(broadcastTemplate, /Draft only — review the copy and your email compliance requirements before sending\./);
});

