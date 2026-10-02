import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const app=readFileSync(new URL('../app.html',import.meta.url),'utf8');
const discord=readFileSync(new URL('../api/discord-oauth.js',import.meta.url),'utf8');

test('dashboard exposes a dedicated broken-code and error-log debug mode',()=>{
  assert.match(app,/data-composer-mode="general"/);
  assert.match(app,/data-composer-mode="debug">Paste Broken Code \/ Error Log/);
  assert.match(app,/DEBUG_MODE_INSTRUCTION/);
  assert.match(app,/QBCore\/ESX\/ox_lib/);
  assert.match(app,/Roblox Luau/);
  assert.match(app,/client:\{source:'stellar-clean-chat-v2',intent:activeMode==='debug'\?'debug-code':'general'\}/);
  assert.match(app,/s\.messages\.push\(\{role:'user',content:userText,mode:activeMode\}\)/);
});

test('generated Lua and Luau blocks have one-click export controls',()=>{
  assert.match(app,/data-code-action="copy-code"/);
  assert.match(app,/Copy ModuleScript/);
  assert.match(app,/data-code-action="download-lua"/);
  assert.match(app,/link\.download=base\+'\.lua'/);
  assert.match(app,/new Blob\(\[withStellarLuaWatermark\(text\)\],\{type:'text\/plain;charset=utf-8'\}\)/);\n  assert.match(app,/Generated with Stellar AI.*https:\/\/trystellarai\.com/);
  assert.match(app,/function codeBlockKind/);
  assert.match(app,/\['luau','roblox','roblox-luau','rbx-luau'\]/);
});

test('Discord is the primary one-click sign-in and OAuth return is consumed safely',()=>{
  const discordPos=app.indexOf('Continue with Discord');
  const googlePos=app.indexOf('Continue with Google',discordPos);
  assert.ok(discordPos>=0);
  assert.ok(googlePos>discordPos);
  assert.match(app,/discord-signin-card/);
  assert.match(app,/discord-primary/);
  assert.match(app,/function consumeDiscordOAuthReturn/);
  assert.match(app,/discord_session/);
  assert.match(app,/history\.replaceState\(null,'',location\.pathname\+location\.search\)/);
  assert.match(app,/if\(token\(\)\)await refreshSession\(\)/);
  assert.match(discord,/scope: 'identify email'/);
  assert.match(discord,/createSession\(email\)/);
  assert.match(discord,/discord_session: session/);
});
