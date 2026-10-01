import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pages=[
  '404.html',
  'acceptable-use.html',
  'affiliate.html',
  'ai-receptionist-thank-you.html',
  'app.html',
  'blog.html',
  'business-builder.html',
  'business-terms.html',
  'business-thank-you.html',
  'cookies.html',
  'deploy-center.html',
  'desktop-agent.html',
  'email-agent.html',
  'index.html',
  'install.html',
  'investors.html',
  'private-workspace.html',
  'jarvis-workspace.html',
  'jarvis.html',
  'legal.html',
  'models.html',
  'offline.html',
  'plans.html',
  'plugins.html',
  'privacy.html',
  'refunds.html',
  'roblox-studio.html',
  'support.html',
  'terms.html',
  'thank-you.html',
  'website-audit-thank-you.html',
  'what-is-what.html',
];

test('every top-level Stellar page uses the shared serious product UI',()=>{
  for(const page of pages){
    const html=readFileSync(new URL('../'+page,import.meta.url),'utf8');
    assert.match(html,/\/lib\/assets\/stellar-serious-ui-v1\.css/,page+' should load the shared serious UI');
  }
});

test('shared serious UI keeps the product restrained and functional',()=>{
  const css=readFileSync(new URL('../lib/assets/stellar-serious-ui-v1.css',import.meta.url),'utf8');
  assert.match(css,/--serious-bg:#0d0d0d/);
  assert.match(css,/\.composer\{/);
  assert.match(css,/\.tool-card:hover/);
  assert.match(css,/\.plan\.featured/);
  assert.match(css,/prefers-reduced-motion/);
});

test('homepage keeps the approved chat-first layer on top of the shared system',()=>{
  const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(home,/stellar-serious-chat-first-v37/);
  assert.match(home,/id="build-form"/);
  assert.match(home,/id="plans"/);
});
