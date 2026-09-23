import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const privacy = readFileSync(new URL('../privacy.html', import.meta.url), 'utf8');
const sitemap = readFileSync(new URL('../sitemap.xml', import.meta.url), 'utf8');
const checkout = readFileSync(new URL('../api/create-checkout.js', import.meta.url), 'utf8');
const ignoreScript = readFileSync(new URL('../scripts/vercel-ignore-build.sh', import.meta.url), 'utf8');
const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));

test('privacy has one clean canonical public route', () => {
  assert.match(privacy, /<link rel="canonical" href="https:\/\/trystellarai\.com\/privacy">/);
  assert.match(privacy, /deadlyfox10@gmail\.com/);
  assert.match(privacy, /We do not sell personal data\./);
  const redirects = new Map((vercel.redirects || []).map(route => [route.source, route]));
  const rewrites = new Map((vercel.rewrites || []).map(route => [route.source, route.destination]));
  assert.equal(redirects.get('/privacy.html')?.destination, '/privacy');
  assert.equal(rewrites.get('/privacy'), '/privacy.html');
});

test('terms uses the clean route while legacy html remains compatible', () => {
  const redirects = new Map((vercel.redirects || []).map(route => [route.source, route]));
  const rewrites = new Map((vercel.rewrites || []).map(route => [route.source, route.destination]));
  assert.equal(redirects.get('/terms.html')?.destination, '/terms');
  assert.equal(rewrites.get('/terms'), '/terms.html');
});

test('Stripe and sitemap use canonical legal URLs', () => {
  assert.match(checkout, /privacy_policy_url: 'https:\/\/trystellarai\.com\/privacy'/);
  assert.match(checkout, /terms_of_service_url: 'https:\/\/trystellarai\.com\/terms'/);
  assert.match(sitemap, /<loc>https:\/\/trystellarai\.com\/privacy<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/trystellarai\.com\/terms<\/loc>/);
  assert.doesNotMatch(sitemap, /trystellarai\.com\/terms\.html/);
});

test('Vercel skips only known non-deployable change classes', () => {
  assert.equal(vercel.ignoreCommand, 'bash scripts/vercel-ignore-build.sh');
  assert.match(ignoreScript, /VERCEL_GIT_PREVIOUS_SHA/);
  assert.match(ignoreScript, /tests\/\*\|docs\/\*\|archive\/\*/);
  assert.match(ignoreScript, /Deployable change detected/);
  assert.match(ignoreScript, /exit 1/);
  assert.match(ignoreScript, /Only tests\/docs\/archive\/workflow\/Markdown files changed/);
});
