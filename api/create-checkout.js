// api/create-checkout.js — Stripe checkout for plans + topups
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin?.includes('trystellarai.com') ? req.headers.origin : 'https://trystellarai.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { plan, email, amount, qty } = req.body || {};
  if (!plan || !email) return res.status(400).json({ error: 'Missing plan or email' });

  const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET) return res.status(500).json({ error: 'Stripe not configured' });

  try {
    const stripe = await import('stripe').then(m => m.default(STRIPE_SECRET));

    // ── TOPUP (one-time payment) ──────────────────────────────
    if (plan === 'topup') {
      const pence = Math.round(Number(amount || qty) || 0);
      if (pence < 50 || pence > 20000) {
        return res.status(400).json({ error: 'Top-up amount must be between 50p and £200' });
      }

      // Bonus credit tiers
      let bonus = 0;
      if (pence >= 500)  bonus = Math.round(pence * 0.05);   // 5% bonus for £5+
      if (pence >= 1000) bonus = Math.round(pence * 0.10);   // 10% bonus for £10+
      if (pence >= 2000) bonus = Math.round(pence * 0.15);   // 15% bonus for £20+
      if (pence >= 5000) bonus = Math.round(pence * 0.20);   // 20% bonus for £50+

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        customer_email: email,
        line_items: [{
          price_data: {
            currency: 'gbp',
            unit_amount: pence,
            product_data: {
              name: `Stellar AI Credit — £${(pence/100).toFixed(2)}${bonus > 0 ? ` + £${(bonus/100).toFixed(2)} bonus` : ''}`,
              description: 'Spend when your plan allowance runs out. Never expires.',
            },
          },
          quantity: 1,
        }],
        success_url: 'https://trystellarai.com/app?payment=success',
        cancel_url:  'https://trystellarai.com/app?payment=cancelled',
        metadata: { email, plan: 'topup', amount: pence, qty: pence, bonus },
      });

      return res.status(200).json({ url: session.url });
    }

    // ── SUBSCRIPTION PLANS ────────────────────────────────────
    const priceMap = {
      'lite':        process.env.STRIPE_PRICE_ID_LITE,
      'pro':         process.env.STRIPE_PRICE_ID_PRO,
      'lite-annual': process.env.STRIPE_PRICE_ID_LITE_ANNUAL,
      'pro-annual':  process.env.STRIPE_PRICE_ID_PRO_ANNUAL,
    };

    const priceId = priceMap[plan];
    if (!priceId) return res.status(400).json({ error: `Unknown plan: ${plan}` });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: 'https://trystellarai.com/app?payment=success',
      cancel_url:  'https://trystellarai.com/app?payment=cancelled',
      metadata: { email, plan },
    });

    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({ error: err.message || 'Stripe error' });
  }
}
