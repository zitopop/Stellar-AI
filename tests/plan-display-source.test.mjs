import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { PLAN_DEFINITIONS } from '../lib/pricing.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function allowanceLabel(plan) {
  const definition = PLAN_DEFINITIONS[plan];
  const period = definition.creditPeriod === 'day' ? 'day' : definition.creditPeriod === 'month' ? 'month' : definition.creditPeriod;
  return `${new Intl.NumberFormat('en-GB').format(definition.includedCredits)} credits/${period}`;
}

test('public pricing UI hydrates allowances from the backend pricing definitions', () => {
  const moduleSource = read('lib/plan-display.js');
  assert.match(moduleSource, /import \{ PLAN_DEFINITIONS \} from '\.\/pricing\.js'/);
  assert.match(moduleSource, /data-plan-allowance/);

  for (const page of ['index.html', 'plans.html']) {
    const source = read(page);
    assert.match(source, /<script type="module" src="\/lib\/plan-display\.js"><\/script>/);
    for (const plan of ['free', 'starter', 'plus', 'pro']) {
      assert.match(source, new RegExp(`data-plan-allowance="${plan}"`));
      assert.match(source, new RegExp(allowanceLabel(plan).replace('/', '\\/')));
    }
  }

  const app = read('app.html');
  assert.match(app, /<script type="module" src="\/lib\/plan-display\.js"><\/script>/);
  for (const plan of ['free', 'starter', 'plus', 'pro']) {
    assert.match(app, new RegExp(`planAllowanceLabel\\('${plan}'`));
    assert.match(app, new RegExp(allowanceLabel(plan).replace('/', '\\/')));
  }
});
