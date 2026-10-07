import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.html',import.meta.url),'utf8');

test('landing page exposes one visible conversion homepage while preserving legacy contracts',()=>{
  assert.match(home,/id="stellar-single-visible-home-v81"/);
  assert.match(home,/\.stellar-account-topbar,\s*\n\.stellar-about-only\{display:none!important\}/);
  assert.match(home,/id="main-content"/);
  assert.match(home,/id="hero-title"/);
  assert.equal((home.match(/<header class="site-header">/g)||[]).length,1);
});

test('phone sidebar toggle remains visible above the drawer and exposes close state',()=>{
  assert.match(app,/id="stellar-mobile-sidebar-toggle-v81"/);
  assert.match(app,/@media\(max-width:900px\)\{[\s\S]*?\.mobile-menu\{[\s\S]*?position:fixed!important;[\s\S]*?z-index:35!important;[\s\S]*?width:44px!important;[\s\S]*?height:44px!important/);
  assert.match(app,/menu\.textContent=closed\?'☰':'×'/);
  assert.match(app,/menu\.setAttribute\('aria-expanded',closed\?'false':'true'\)/);
});
