import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('analytics never rewrites pricing, credits or homepage structure',()=>{
  const publicAnalytics=read('lib/assets/stellar-analytics.js');
  const telemetry=read('lib/assets/telemetry.js');
  for(const source of [publicAnalytics,telemetry]){
    assert.doesNotMatch(source,/credit-wallet|wallet top.?up|makePackLink|ensureCreditIcon|ensureAccountCreditCard|tidyLandingPage|polishHomepageContent|injectPublicPolish/i);
  }
  assert.match(publicAnalytics,/privacy-safe counters only/);
  assert.match(telemetry,/analytics only/);
});

test('usage panel has a contextual, non-blocking upgrade path',()=>{
  const app=read('app.html');
  assert.match(app,/function usageUpgradeHtml\(\)/);
  assert.match(app,/data-source="usage"/);
  assert.match(app,/upgrade-from-usage/);
  assert.match(app,/usage-panel-opened/);
  assert.match(app,/plans-panel-opened/);
  assert.match(app,/£8\/month/);
  assert.match(app,/£20\/month/);
  assert.match(app,/£75\/month/);
});

test('conversion endpoint accepts the new high-signal growth events',()=>{
  const api=read('api/get-plan.js');
  const vercel=JSON.parse(read('vercel.json'));
  assert.deepEqual(vercel.rewrites.find(item=>item.source==='/api/track-event'),{source:'/api/track-event',destination:'/api/get-plan?mode=track-event'});
  for(const event of ['usage-panel-opened','plans-panel-opened','upgrade-from-usage','business-service-clicked','pricing-view','plan-free-selected','plan-starter-selected','plan-plus-selected','plan-pro-selected']){
    assert.match(api,new RegExp("'"+event+"'"));
  }
});

test('revenue ops can read usage and business conversion intent',()=>{
  const metrics=read('lib/conversion-metrics.js');
  assert.match(metrics,/usagePanelOpens/);
  assert.match(metrics,/planPanelOpens/);
  assert.match(metrics,/usageUpgradeIntents/);
  assert.match(metrics,/businessServiceClicks/);
  assert.match(metrics,/pricingViews/);
  assert.match(metrics,/freePlanSelections/);
  assert.match(metrics,/starterPlanSelections/);
  assert.match(metrics,/plusPlanSelections/);
  assert.match(metrics,/proPlanSelections/);
});
