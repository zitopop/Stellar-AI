import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appHtml = await readFile(new URL('../app.html', import.meta.url), 'utf8');

test('account access presents Discord first while retaining Google and email', () => {
  assert.match(appHtml, /Use Discord, Google or email\./);
  const discord = appHtml.indexOf('Continue with Discord');
  const google = appHtml.indexOf('Continue with Google', discord);
  assert.ok(discord >= 0);
  assert.ok(google > discord);
  assert.match(appHtml, /Primary one-click sign-in for FiveM and Roblox builders\./);
  assert.match(appHtml, /Create account/);
});

test('account access keeps all current authentication actions', () => {
  assert.match(appHtml, /id="googleRender"/);
  assert.match(appHtml, /id="googleFallback"/);
  assert.match(appHtml, /discordHref='\/api\/discord-oauth'/);
  assert.match(appHtml, /id="discordSignin"/);
  assert.match(appHtml, /consumeDiscordOAuthReturn/);
  assert.match(appHtml, /data-action="email-login"/);
  assert.match(appHtml, /data-action="email-signup"/);
  assert.match(appHtml, /action:'googleLogin'/);
});

test('account access has a dark mobile-safe settings sheet', () => {
  assert.match(appHtml, /\.google-box\{display:grid;gap:9px/);
  assert.match(appHtml, /\.panel\{width:min\(640px,100%\);max-height:88dvh/);
  assert.match(appHtml, /@media\(max-width:540px\)/);
  assert.match(appHtml, /\.panel-backdrop\{align-items:end;padding:0\}/);
  assert.match(appHtml, /\.panel\{width:100%;max-height:91dvh;border-radius:24px 24px 0 0/);
  assert.match(appHtml, /safe-area-inset-bottom/);
});
