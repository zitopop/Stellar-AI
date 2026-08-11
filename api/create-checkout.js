// api/create-checkout.js — Stripe checkout for monthly and annual plans
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin?.includes('trystellarai.com') ? req.headers.origin : 'https://trystellarai.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { plan, email } = req.body || {};
  if (!plan || !email) return res.status(400).json({ error: 'Missing plan or email' });

  const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET) return res.status(500).json({ error: 'Stripe not configured' });

  // Map plan to price ID
  const priceMap = {
    'lite':         process.env.STRIPE_PRICE_ID_LITE,
    'pro':          process.env.STRIPE_PRICE_ID_PRO,
    'lite-annual':  process.env.STRIPE_PRICE_ID_LITE_ANNUAL,
    'pro-annual':   process.env.STRIPE_PRICE_ID_PRO_ANNUAL,
  };

  const priceId = priceMap[plan];
  if (!priceId) return res.status(400).json({ error: `Unknown plan: ${plan}` });

  try {
    const stripe = await import('stripe').then(m => m.default(STRIPE_SECRET));

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
