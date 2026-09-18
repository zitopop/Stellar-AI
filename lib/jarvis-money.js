const DEFAULT_STARTING_CASH = 10000;

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function createPaperPortfolio(input = {}) {
  return {
    currency: String(input.currency || 'GBP').toUpperCase(),
    startingCash: Math.max(0, num(input.startingCash, DEFAULT_STARTING_CASH)),
    cash: Math.max(0, num(input.cash, input.startingCash ?? DEFAULT_STARTING_CASH)),
    positions: Array.isArray(input.positions) ? input.positions : [],
    trades: Array.isArray(input.trades) ? input.trades : [],
  };
}

export function paperTrade(portfolioInput, order = {}) {
  const portfolio = createPaperPortfolio(portfolioInput);
  const symbol = String(order.symbol || '').trim().toUpperCase();
  const side = String(order.side || '').toLowerCase();
  const quantity = num(order.quantity);
  const price = num(order.price);
  const fee = Math.max(0, num(order.fee));
  if (!symbol || !['buy', 'sell'].includes(side) || quantity <= 0 || price <= 0) {
    throw new Error('Valid symbol, side, quantity and price are required.');
  }
  const notional = quantity * price;
  const positions = portfolio.positions.map((p) => ({ ...p }));
  const idx = positions.findIndex((p) => p.symbol === symbol);
  const currentQty = idx >= 0 ? num(positions[idx].quantity) : 0;
  if (side === 'buy' && portfolio.cash < notional + fee) throw new Error('Insufficient paper cash.');
  if (side === 'sell' && currentQty < quantity) throw new Error('Insufficient paper position.');
  portfolio.cash += side === 'buy' ? -(notional + fee) : notional - fee;
  const nextQty = side === 'buy' ? currentQty + quantity : currentQty - quantity;
  if (nextQty === 0 && idx >= 0) positions.splice(idx, 1);
  else if (idx >= 0) positions[idx] = { ...positions[idx], quantity: nextQty };
  else positions.push({ symbol, quantity: nextQty });
  portfolio.positions = positions;
  portfolio.trades.push({ id: `paper_${Date.now()}`, symbol, side, quantity, price, fee, notional, executedAt: new Date().toISOString(), mode: 'paper' });
  return portfolio;
}

export function classifyMoneyAction(action = {}) {
  const type = String(action.type || '').toLowerCase();
  const realMoney = action.realMoney === true || ['buy','sell','transfer','withdraw','deposit','subscribe','ad_spend'].includes(type);
  if (realMoney) return { level: 'APPROVAL_REQUIRED', executable: false, reason: 'Real-money actions require explicit owner approval.' };
  if (['research','watchlist','analysis','paper_trade','lead_research','conversion_review'].includes(type)) return { level: 'AUTO_SAFE', executable: true };
  return { level: 'REVIEW', executable: false, reason: 'Unknown financial action.' };
}
