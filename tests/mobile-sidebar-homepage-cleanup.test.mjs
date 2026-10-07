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

test('phone sidebar always has visible open and close controls',()=>{
  assert.match(app,/id="stellar-mobile-sidebar-toggle-v81"/);
  assert.match(app,/id="menuBtn"[^>]*aria-label="Open sidebar"/);
  assert.match(app,/id="sideCloseBtn"[^>]*aria-label="Close sidebar"[^>]*>×<\/button>/);
  assert.match(app,/\.side-close-mobile\{[\s\S]*?display:none[\s\S]*?@media\(max-width:900px\)[\s\S]*?\.side-close-mobile\{[\s\S]*?display:grid!important;[\s\S]*?width:44px!important;[\s\S]*?height:44px!important/);
  assert.match(app,/\$\('sideCloseBtn'\)\?\.addEventListener\('click',\(\)=>closeSide\(\)\)/);
  assert.match(app,/menu\.setAttribute\('aria-expanded',closed\?'false':'true'\)/);
});
