import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const app = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const chat = fs.readFileSync(new URL('../api/chat.js', import.meta.url), 'utf8');
const terms = fs.readFileSync(new URL('../terms.html', import.meta.url), 'utf8');
const models = fs.readFileSync(new URL('../models.html', import.meta.url), 'utf8');
const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const routing = fs.readFileSync(new URL('../docs/AI_MODEL_ROUTING.md', import.meta.url), 'utf8');

test('public model branding stays Stellar-owned and provider-neutral', () => {
  for (const name of ['Stellar Fast', 'Stellar Core', 'Stellar Deep', 'Stellar Max']) {
    assert.ok(app.includes(name));
    assert.ok(models.includes(name));
  }
  assert.doesNotMatch(app, /GPT-6|Gemini 3\.8|Grok 4\.7|Claude (?:Haiku|Sonnet|Opus|Fable)/);
  assert.match(chat, /const PUBLIC_MODEL_INPUTS = new Set\(\[\s*'spark', 'star', 'comet', 'nova',\s*\]\);/);
});

test('current internal provider catalog is documented and routed with current IDs', () => {
  for (const id of ['gpt-6-luna', 'gpt-6-sol', 'gpt-6-astra', 'gemini-3.8-flash', 'grok-4.7', 'claude-sonnet-5-5', 'claude-opus-5-5', 'claude-fable-5-1']) {
    assert.ok(chat.includes(id), `chat routing should recognise ${id}`);
    assert.ok(routing.includes(id), `routing docs should document ${id}`);
  }
  assert.match(chat, /gaming:\s*\{ model: 'grok-4\.7'/);
  assert.match(chat, /researcher:\s*\{ model: 'gemini-3\.8-flash'/);
  assert.match(chat, /planner:\s*\{ model: 'gpt-6-sol'/);
});

test('legal and repository docs state the provider-independent contract', () => {
  assert.match(terms, /Provider-independent model access/);
  assert.match(terms, /not to a particular third-party company, model name, model version/);
  assert.match(models, /buying a plan does not promise access to a named third-party model/);
  assert.match(readme, /Customers see only \*\*Stellar Fast, Stellar Core, Stellar Deep and Stellar Max\*\*/);
  assert.match(readme, /docs\/AI_MODEL_ROUTING\.md/);
});
