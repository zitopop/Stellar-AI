// api/create-checkout.js
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const DOMAIN = 'https://trystellarai.com';

const SUBSCRIPTIONS = {
  lite: process.env.STRIPE_PRICE_ID_LITE,
  pro:  process.env.STRIPE_PRICE_ID_PRO
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { plan, qty, email } = req.body || {};

  try {
    if (plan === 'topup') {
      const n = Math.max(50, Math.min(10000, parseInt(qty, 10) || 300));
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: email || undefined,
        line_items: [{
          price_data: {
            currency: 'gbp',
            unit_amount: n,
            product_data: { name: `Stellar AI credit — £${(n / 100).toFixed(2)}` }
          },
          quantity: 1
        }],
        metadata: { plan: 'topup', qty: String(n), email: email || '' },
        success_url: `${DOMAIN}/?success=true&plan=topup&qty=${n}`,
        cancel_url: `${DOMAIN}/`
      });
      return res.status(200).json({ url: session.url });
    }

    const priceId = SUBSCRIPTIONS[plan];
    if (!priceId) {
      return res.status(500).json({ error: 'Payments are not set up yet — check back soon.' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { plan, email: email || '' },
      success_url: `${DOMAIN}/?success=true&plan=${plan}`,
      cancel_url: `${DOMAIN}/`
    });
    return res.status(200).json({ url: session.url });

  } catch (e) {
    return res.status(500).json({ error: 'Checkout failed — please try again.' });
  }
}
