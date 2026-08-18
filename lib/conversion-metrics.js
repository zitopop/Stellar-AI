const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function conversionMetricKey(name, date = new Date()) {
  return `stellar:conversion:${dayKey(date)}:${name}`;
}

export async function incrementConversionMetric(name, amount = 1, date = new Date()) {
  if (!KV_URL || !KV_TOKEN) return false;
  try {
    const response = await fetch(`${KV_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['INCRBY', conversionMetricKey(name, date), Math.max(0, Math.round(Number(amount) || 0))]]),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function checkoutAttemptKey(id) {
  return `stellar:checkout-attempt:${id}`;
}

export async function createCheckoutAttempt({ id, email, plan }) {
  if (!KV_URL || !KV_TOKEN || !id || !email) return false;
  try {
    const response = await fetch(`${KV_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['SET', checkoutAttemptKey(id), JSON.stringify({ email, plan, status: 'started' }), 'EX', 60 * 60 * 24]]),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function recordCheckoutCancellation({ id, email }) {
  if (!KV_URL || !KV_TOKEN || !id || !email) return false;
  try {
    const response = await fetch(`${KV_URL}/get/${encodeURIComponent(checkoutAttemptKey(id))}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
    });
    if (!response.ok) return false;
    const raw = (await response.json()).result;
    const attempt = raw ? JSON.parse(raw) : null;
    if (!attempt || attempt.email !== email || attempt.status !== 'started') return false;
    const marked = await fetch(`${KV_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['SET', checkoutAttemptKey(id), JSON.stringify({ ...attempt, status: 'cancelled' }), 'EX', 60 * 60 * 24]]),
    });
    if (!marked.ok) return false;
    return incrementConversionMetric('checkout-cancelled-or-expired');
  } catch {
    return false;
  }
}

export async function readConversionMetrics(date = new Date()) {
  const metrics = { date: dayKey(date), checkoutStarted: 0, checkoutCompleted: 0, checkoutCancelledOrExpired: 0, subscriptionCompleted: 0, topupCompleted: 0, revenuePence: 0 };
  if (!KV_URL || !KV_TOKEN) return { ok: false, metrics, error: 'Account storage is not configured.' };
  const names = ['checkout-started', 'checkout-completed', 'checkout-cancelled-or-expired', 'subscription-completed', 'topup-completed', 'revenue-pence'];
  try {
    const response = await fetch(`${KV_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(names.map(name => ['GET', conversionMetricKey(name, date)])),
    });
    if (!response.ok) return { ok: false, metrics, error: 'Could not read conversion metrics.' };
    const values = await response.json();
    const result = Array.isArray(values) ? values : [];
    const amount = index => Math.max(0, Number(result[index]?.result) || 0);
    return {
      ok: true,
      metrics: {
        ...metrics,
        checkoutStarted: amount(0),
        checkoutCompleted: amount(1),
        checkoutCancelledOrExpired: amount(2),
        subscriptionCompleted: amount(3),
        topupCompleted: amount(4),
        revenuePence: amount(5),
      },
    };
  } catch {
    return { ok: false, metrics, error: 'Could not read conversion metrics.' };
  }
}
