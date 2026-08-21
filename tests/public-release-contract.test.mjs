import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const indexHtml = read('index.html');
const appHtml = read('app.html');
const simulatorBlogHtml = read('blog-roblox-simulator-game.html');

test('public Simulator destinations use the approved Roblox game ID everywhere', () => {
  for (const html of [indexHtml, appHtml, simulatorBlogHtml]) {
    assert.doesNotMatch(html, /121360078498296/);
    assert.match(html, /https:\/\/www\.roblox\.com\/games\/17874928076\/Stellar-Simulator/);
  }
});

test('public pricing copy and structured offers agree on current GBP pricing', () => {
  assert.match(indexHtml, /"name":"Plus monthly","price":"20","priceCurrency":"GBP"/);
  assert.match(indexHtml, /"name":"Plus yearly","price":"168","priceCurrency":"GBP"/);
  assert.match(indexHtml, /"name":"Pro monthly","price":"75","priceCurrency":"GBP"/);
  assert.match(indexHtml, /"name":"Pro yearly","price":"630","priceCurrency":"GBP"/);
  assert.match(appHtml, /"name": "Plus", "price": "20", "priceCurrency": "GBP"/);
  assert.match(appHtml, /"name": "Pro", "price": "75", "priceCurrency": "GBP"/);
  for (const html of [indexHtml, appHtml]) {
    assert.match(html, /£20/);
    assert.match(html, /£75/);
    assert.match(html, /£168\/year/);
    assert.match(html, /£630\/year/);
  }
});

test('the public support address remains a one-line mail link in settings', () => {
  assert.match(appHtml, /href="mailto:support@trystellarai\.com"[^>]*white-space:nowrap[^>]*>support@trystellarai\.com<\/a>/);
});

test('all published standalone blog articles have non-empty page titles and descriptions', () => {
  const blogFiles = readdirSync(root).filter((name) => /^blog-.*\.html$/.test(name));
  assert.equal(blogFiles.length, 56);
  for (const file of blogFiles) {
    const html = read(file);
    assert.match(html, /<title>[^<]+<\/title>/, `${file} requires a title`);
    assert.match(html, /<meta name="description" content="[^"]+">/, `${file} requires a description`);
  }
});

test('the unsent feature announcement broadcast draft preserves its review notice and official destination', () => {
  const email = read('broadcast-template.html');
  assert.match(email, /The Stellar AI Team 🚀/);
  assert.match(email, /https:\/\/trystellarai\.com\/app/);
  assert.match(email, /Draft only — review the copy and your email compliance requirements before sending\./);
});
