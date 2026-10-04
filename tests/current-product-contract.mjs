import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

export function assertAppContract(){
  const app=read('app.html');
  assert.match(app,/id="chatForm"/);
  assert.match(app,/id="prompt"/);
  assert.match(app,/id="sendBtn"/);
  assert.match(app,/id="usagePill"/);
  assert.match(app,/function renderUsagePanel\(\)/);
  assert.match(app,/function renderPlansPanel\(\)/);
  assert.match(app,/function startPlanCheckout\(plan\)/);
  assert.match(app,/No sign-in is required to try the workspace/);
  assert.match(app,/fetch\('\/api\/chat'/);
  assert.match(app,/fetch\('\/api\/get-plan'/);
  assert.match(app,/Authorization='Bearer '/);
  assert.doesNotMatch(app,/id="topupAmount"|startCreditCheckout|renderCreditsPanel|credit-checkout/i);
}

export function assertHomeContract(){
  const home=read('index.html');
  assert.match(home,/id="build-form"/);
  assert.match(home,/id="plans"/);
  assert.match(home,/\/app\?welcome=1/);
  assert.match(home,/Ask anything\./);
  assert.match(home,/stellar-serious-chat-first-v37/);
  assert.doesNotMatch(home,/(credits\/month|Buy Stellar Credits|top.?up)/i);
}

export function assertPlansContract(){
  const plans=read('plans.html');
  const app=read('app.html');
  for(const label of ['Free','Starter','Plus','Pro']) assert.match(plans,new RegExp('>'+label+'<'));
  for(const price of ['£0','£8','£20','£75']) assert.ok(plans.includes(price),price);
  for(const plan of ['starter','plus','pro']) assert.match(plans,new RegExp('/app\\?upgrade='+plan));
  assert.match(plans,/usage/i);
  assert.match(app,/function startPlanCheckout\(plan\)/);
  assert.match(app,/sessionStorage\.setItem\('stellar-pending-upgrade',p\)/);
  assert.doesNotMatch(plans,/\bcredits?\b|top.?up/i);
}

export function assertLegalContract(){
  for(const path of ['legal.html','terms.html','refunds.html','what-is-what.html']){
    const html=read(path);
    assert.match(html,/usage/i,path+' should explain usage');
    assert.doesNotMatch(html,/\bcredits?\b/i,path+' should not describe retired credits');
  }
  assert.match(read('terms.html'),/connected tools|connected computers/i);
  assert.match(read('refunds.html'),/cancel/i);
}

export function assertSettingsContract(){
  const app=read('app.html');
  assert.match(app,/data-open="settings"/);
  assert.match(app,/function renderSettingsPanel\(\)/);
  assert.match(app,/id="usagePill"/);
  assert.match(app,/Plugins|plugins/);
  assert.doesNotMatch(app,/topupAmount|renderCreditsPanel|startCreditCheckout/);
}

export function assertSupportContract(){
  const support=read('support.html');
  assert.match(support,/Support/i);
  assert.match(support,/Billing|account|privacy/i);
  assert.match(support,/usage/i);
  assert.doesNotMatch(support,/>Owner tools</i);
  assert.doesNotMatch(support,/owner perks/i);
  const plugins=read('plugins.html');
  assert.doesNotMatch(plugins,/Owner-only integrations/i);
}

export function assertJarvisContract(){
  const jarvis=read('jarvis.html');
  const plans=read('plans.html');
  assert.match(jarvis,/Jarvis/i);
  assert.match(plans,/Jarvis Voice \+ Vision/);
  assert.match(plans,/Jarvis Pro briefings \+ proactive alerts/);
  assert.match(plans,/StellarX computer control beta/);
}

export function assertSeoUsageCopyContract(){
  const pages=[
    'traffic-plan/index.html',
    'google-growth/index.html',
    'qbcore-drug-system-script/index.html',
    'qbcore-bank-robbery-script/index.html',
    'fivem-dispatch-system-script/index.html',
    'fivem-housing-script-generator/index.html',
    'growth-kit/index.html',
    'roblox-trading-system-script-generator/index.html',
    'ai-game-script-generator/index.html',
  ];
  for(const page of pages){
    const html=read(page);
    assert.doesNotMatch(html,/\bcredits?\b/i,page+' should use current customer-facing usage language');
  }
}

export function assertSiteContract(){
  const pages=["404.html","acceptable-use.html","affiliate.html","ai-receptionist-thank-you.html","app.html","blog.html","business-builder.html","business-terms.html","business-thank-you.html","cookies.html","deploy-center.html","desktop-agent.html","email-agent.html","index.html","install.html","investors.html","private-workspace.html","jarvis-workspace.html","jarvis.html","legal.html","models.html","offline.html","plans.html","plugins.html","privacy.html","refunds.html","roblox-studio.html","support.html","terms.html","thank-you.html","website-audit-thank-you.html","what-is-what.html"];
  for(const page of pages){
    const html=read(page);
    assert.match(html,/\/lib\/assets\/stellar-serious-ui-v1\.css/,page);
    assert.doesNotMatch(html,/stellar-serious-ui-v1\.css">\\n<\/head>/,page);
  }
}
