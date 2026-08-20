import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const landingHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('Task 123 keeps the primary hero CTA honest, free, and routed to the workspace', () => {
  assert.match(landingHtml, /<a href="\/app" class="button button-primary">Generate your first script free <span class="button-arrow">→<\/span><\/a>/);
  assert.match(landingHtml, /<div class="hero-footnote"><span>No card needed to begin<\/span><span>Free starting credit<\/span><span>Built for real project files<\/span><\/div>/);
});
