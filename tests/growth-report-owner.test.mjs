import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app=readFileSync(new URL('../app.html',import.meta.url),'utf8');

test('owner settings expose aggregate growth and revenue reporting',()=>{
  assert.match(app,/data-action="open-growth-report"/);
  assert.match(app,/async function renderGrowthReportPanel\(\)/);
  assert.match(app,/action:'conversionMetrics'/);
  assert.match(app,/action:'funnelMetrics'/);
  assert.match(app,/Acquisition by source/);
  for(const channel of ['GitHub','Cfx.re','BuiltByBit','Google','Discord','Direct']) assert.match(app,new RegExp(channel.replace('.','\\.')));
});
