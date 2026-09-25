import assert from 'node:assert/strict';
import { createPaperPortfolio, paperTrade, classifyMoneyAction } from '../lib/jarvis-money.js';
const p = createPaperPortfolio({ startingCash: 1000 });
const bought = paperTrade(p, { symbol: 'TEST', side: 'buy', quantity: 2, price: 100 });
assert.equal(bought.cash, 800);
assert.equal(bought.positions[0].quantity, 2);
assert.equal(classifyMoneyAction({ type: 'paper_trade' }).executable, true);
assert.equal(classifyMoneyAction({ type: 'buy', realMoney: true }).executable, false);
console.log('Jarvis money tests passed');
