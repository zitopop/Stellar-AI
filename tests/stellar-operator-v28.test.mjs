import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const operator = readFileSync(new URL('../stellar-operator-v28.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../stellar-operator-v28.css', import.meta.url), 'utf8');

test('workspace loads the Stellar Operator layer after the existing app helpers', () => {
  assert.match(app, /\/stellar-operator-v28\.css\?v=20260927-v28/);
  assert.match(app, /\/stellar-operator-v28\.js\?v=20260927-v28/);
});

test('operator keeps one composer and adds Auto, Chat and Action modes without replacing billing truth', () => {
  assert.equal((app.match(/id="chatForm"/g) || []).length, 1);
  assert.match(operator, /option value="auto">Auto/);
  assert.match(operator, /option value="chat">Chat/);
  assert.match(operator, /option value="action">Action/);
  assert.match(operator, /addEventListener\('submit',onSubmitCapture,true\)/);
  assert.match(operator, /openComputerActionCard/);
  assert.match(operator, /applyModelSelection/);
  assert.match(operator, /modelAllowed/);
  assert.doesNotMatch(operator, /fetch\(['"]\/api\/create-checkout/);
});

test('Auto routing is conservative and Action remains approval-first', () => {
  assert.match(operator, /words<=16&&score===0\)\?'spark':'star'/);
  assert.match(operator, /score>=3&&unlocked\('comet'\)/);
  assert.match(operator, /score>=6&&unlocked\('nova'\)/);
  assert.match(operator, /Review the Action card before StellarX opens/);
  assert.match(css, /@media\(max-width:640px\)/);
});
