import fs from 'node:fs';

function insertBeforeLast(source, needle, addition, label) {
  const index = source.lastIndexOf(needle);
  if (index < 0) throw new Error(`Could not find ${label}`);
  return source.slice(0, index) + addition + source.slice(index);
}

const landingPath = 'index.html';
let landing = fs.readFileSync(landingPath, 'utf8');
if (landing.includes('id="pricing-intent-bridge"')) throw new Error('Landing pricing intent bridge already exists.');

const landingBridge = `\n<script id="pricing-intent-bridge">\n(() => {\n  const intentKey = 'stellar:upgrade-intent';\n  const planLinks = [\n    ['Get Starter — Choose the Starter plan', 'starter'],\n    ['Get Plus — Choose the Plus plan', 'plus'],\n    ['Get Pro — Choose the Pro plan', 'pro'],\n  ];\n\n  function connectPricingIntent() {\n    for (const [label, plan] of planLinks) {\n      const link = document.querySelector(\`a[aria-label="\${label}"]\`);\n      if (!link) continue;\n      link.href = \`/app?upgrade=\${plan}\`;\n      link.addEventListener('click', () => {\n        try { sessionStorage.setItem(intentKey, plan); } catch {}\n      }, { passive: true });\n    }\n  }\n\n  if (document.readyState === 'loading') {\n    document.addEventListener('DOMContentLoaded', connectPricingIntent, { once: true });\n  } else {\n    connectPricingIntent();\n  }\n})();\n</script>\n`;
landing = insertBeforeLast(landing, '</body>', landingBridge, 'landing </body>');
fs.writeFileSync(landingPath, landing);

const appPath = 'app.html';
let app = fs.readFileSync(appPath, 'utf8');
if (app.includes('id="upgrade-intent-router"')) throw new Error('App upgrade intent router already exists.');

const appRouter = `\n<script id="upgrade-intent-router">\n(() => {\n  const intentKey = 'stellar:upgrade-intent';\n  const allowedPlans = new Set(['starter', 'plus', 'pro']);\n\n  function readUpgradeIntent() {\n    const params = new URLSearchParams(window.location.search);\n    const urlPlan = String(params.get('upgrade') || '').toLowerCase();\n    let storedPlan = '';\n    try { storedPlan = String(sessionStorage.getItem(intentKey) || '').toLowerCase(); } catch {}\n    const plan = allowedPlans.has(urlPlan) ? urlPlan : (allowedPlans.has(storedPlan) ? storedPlan : '');\n    if (plan) {\n      try { sessionStorage.removeItem(intentKey); } catch {}\n    }\n    return plan;\n  }\n\n  function clearUpgradeQuery() {\n    const url = new URL(window.location.href);\n    if (!url.searchParams.has('upgrade')) return;\n    url.searchParams.delete('upgrade');\n    const next = url.pathname + (url.search ? url.search : '') + (url.hash ? url.hash : '');\n    history.replaceState(history.state, '', next);\n  }\n\n  function openRequestedPlan() {\n    const plan = readUpgradeIntent();\n    if (!plan) return;\n    if (typeof openPlans !== 'function') return;\n\n    openPlans();\n    clearUpgradeQuery();\n\n    requestAnimationFrame(() => {\n      const card = document.getElementById(\`plan-card-\${plan}\`);\n      const primaryAction = document.getElementById(\`plan-btn-\${plan}\`);\n      card?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });\n      primaryAction?.focus({ preventScroll: true });\n    });\n  }\n\n  if (document.readyState === 'loading') {\n    document.addEventListener('DOMContentLoaded', () => setTimeout(openRequestedPlan, 0), { once: true });\n  } else {\n    setTimeout(openRequestedPlan, 0);\n  }\n})();\n</script>\n`;
app = insertBeforeLast(app, '</body>', appRouter, 'app </body>');
fs.writeFileSync(appPath, app);

const testPath = 'tests/upgrade-intent-routing.test.mjs';
const testLines = [
  "import assert from 'node:assert/strict';",
  "import { readFileSync } from 'node:fs';",
  "import test from 'node:test';",
  '',
  "const landing = readFileSync(new URL('../index.html', import.meta.url), 'utf8');",
  "const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');",
  '',
  "test('landing pricing preserves paid plan intent when opening the workspace', () => {",
  "  assert.match(landing, /id=\"pricing-intent-bridge\"/);",
  "  for (const [label, plan] of [['Get Starter — Choose the Starter plan', 'starter'], ['Get Plus — Choose the Plus plan', 'plus'], ['Get Pro — Choose the Pro plan', 'pro']]) {",
  "    assert.ok(landing.includes(`['${label}', '${plan}']`));",
  "  }",
  "  assert.ok(landing.includes('link.href = `/app?upgrade=${plan}`;'));",
  "  assert.match(landing, /sessionStorage\\.setItem\\(intentKey, plan\\)/);",
  "});",
  '',
  "test('workspace opens and focuses the paid plan requested from landing pricing', () => {",
  "  assert.match(app, /id=\"upgrade-intent-router\"/);",
  "  assert.match(app, /allowedPlans = new Set\\(\\['starter', 'plus', 'pro'\\]\\)/);",
  "  assert.match(app, /if \\(typeof openPlans !== 'function'\\) return;\\s+openPlans\\(\\);/);",
  "  assert.ok(app.includes('plan-card-${plan}'));",
  "  assert.ok(app.includes('plan-btn-${plan}'));",
  "  assert.match(app, /url\\.searchParams\\.delete\\('upgrade'\\)/);",
  "});",
  '',
];
fs.writeFileSync(testPath, testLines.join('\n'));

console.log('Applied landing-to-app paid plan intent routing.');
