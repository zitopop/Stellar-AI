import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const analytics = readFileSync(new URL('../lib/assets/stellar-analytics.js', import.meta.url), 'utf8');
const telemetry = readFileSync(new URL('../lib/assets/telemetry.js', import.meta.url), 'utf8');
const landing = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const affiliate = readFileSync(new URL('../affiliate.html', import.meta.url), 'utf8');

test('retired credit promotions are not reintroduced by runtime scripts', () => {
  assert.doesNotMatch(analytics, /promo and giveaway credits|wallet top.?ups|community promo credits/i);
  assert.doesNotMatch(telemetry, /promo and giveaway credits|wallet top.?ups|makePackLink|ensureCreditIcon/i);
  assert.doesNotMatch(landing, /Buy Stellar Credits|credits\/month|wallet top.?up/i);
});

test('creator referrals do not promise cash or usage rewards', () => {
  assert.match(affiliate, /No cash or usage reward is promised/);
  assert.match(affiliate, /No automatic reward/);
  assert.doesNotMatch(affiliate, /100 bonus Stellar Credits|guaranteed income/i);
});
