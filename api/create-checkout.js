// api/create-checkout.js
// Zero npm dependencies — uses Stripe REST API directly via fetch
// Works on any Vercel project without needing package.json or npm install

const DOMAIN = 'https://trystellarai.com';

function stripeKey() {
  return process.env.STRIPE_SECRET_KEY || '';
}

// Build URL-encoded form body for Stripe API
function encode(obj, prefix = '') {
  const parts = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === 'object' && !Array.isArray(v)) {
      parts.push(encode(v, key));
    } else if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (typeof item === 'object') {
          parts.push(encode(item, `${key}[${i}]`));
        } else {
          parts.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(item)}`);
        }
      });
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
    }
  }
  return parts.join('&');
}

async function stripePost(path, data) {
  const key = stripeKey();
  if (!key) throw new Error('STRIPE_SECRET_KEY not set in Vercel environment variables');
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: encode(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `Stripe error ${res.status}`);
  return json;
}

async function stripeGet(path) {
  const key = stripeKey();
  if (!key) throw new Error('STRIPE_SECRET_KEY not set in Vercel environment variables');
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { 'Authorization': `Bearer ${key}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `Stripe error ${res.status}`);
  return json;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', DOMAIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Health check
  if (req.method === 'GET') {
    return res.json({ hasStripeKey: !!stripeKey(), pricesAutomatic: true });
  }

  if (req.method !== 'POST') return res.status(405).end();

  const { mode, amount, email } = req.body || {};

  try {

    // ── Billing portal (manage / cancel) ─────────────────────────────
    if (mode === 'portal') {
      if (!email) return res.status(400).json({ error: 'Email required' });
      const customers = await stripeGet(`/customers?email=${encodeURIComponent(email)}&limit=1`);
      if (!customers.data?.length) return res.json({ error: 'No billing account found for this email' });
      const portal = await stripePost('/billing_portal/sessions', {
        customer: customers.data[0].id,
        return_url: DOMAIN,
      });
      return res.json({ url: portal.url });
    }

    // ── LED Theme — one-time £20 ─────────────────────────────────────
    if (mode === 'led') {
      const priceId = process.env.stellar_ai_led_theme;
      if (!priceId) return res.status(500).json({ error: 'stellar_ai_led_theme env var not set' });
      const session = await stripePost('/checkout/sessions', {
        mode: 'payment',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': 1,
        success_url: `${DOMAIN}/?theme_unlocked=led`,
        cancel_url: DOMAIN,
        ...(email && { customer_email: email }),
      });
      return res.json({ url: session.url });
    }

    // ── Wallet top-up ─────────────────────────────────────────────────
    if (mode === 'wallet') {
      const pence = parseInt(amount);
      if (!pence || pence < 100) return res.status(400).json({ error: 'Minimum top-up is £1' });
      const session = await stripePost('/checkout/sessions', {
        mode: 'payment',
        'line_items[0][quantity]': 1,
        'line_items[0][price_data][currency]': 'gbp',
        'line_items[0][price_data][unit_amount]': pence,
        'line_items[0][price_data][product_data][name]': `Stellar AI Wallet — £${(pence/100).toFixed(2)} credit`,
        'line_items[0][price_data][product_data][description]': 'Messages cost 10p each when your free bar runs out',
        success_url: `${DOMAIN}/?credit=${pence}`,
        cancel_url: DOMAIN,
        ...(email && { customer_email: email }),
      });
      return res.json({ url: session.url });
    }

    // ── Subscriptions ─────────────────────────────────────────────────
    const plans = {
      pro:      { amount: 1000, name: 'Stellar AI Pro',      desc: 'Power model · all themes · refills every 4h', success: 'upgraded=pro' },
      max:      { amount: 3000, name: 'Stellar AI Max',      desc: 'Ultra model · HD images · refills every 2h',  success: 'upgraded=max' },
      ultimate: { amount: 5000, name: 'Stellar AI Ultimate', desc: 'Max Ultra · Supernova theme · refills hourly',  success: 'upgraded=ultimate' },
    };
    const plan = plans[mode];
    if (!plan) return res.status(400).json({ error: `Unknown mode: ${mode}` });

    const session = await stripePost('/checkout/sessions', {
      mode: 'subscription',
      'line_items[0][quantity]': 1,
      'line_items[0][price_data][currency]': 'gbp',
      'line_items[0][price_data][unit_amount]': plan.amount,
      'line_items[0][price_data][recurring][interval]': 'month',
      'line_items[0][price_data][product_data][name]': plan.name,
      'line_items[0][price_data][product_data][description]': plan.desc,
      success_url: `${DOMAIN}/?${plan.success}`,
      cancel_url: DOMAIN,
      ...(email && { customer_email: email }),
    });
    return res.json({ url: session.url });

  } catch (err) {
    console.error('Checkout error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
