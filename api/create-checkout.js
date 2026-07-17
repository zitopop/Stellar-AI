import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const DOMAIN = 'https://trystellarai.com';

const PRICES = {
  lite: { id: process.env.STRIPE_PRICE_ID_LITE, mode: 'subscription' },
  pro: { id: process.env.STRIPE_PRICE_ID_PRO, mode: 'subscription' },
  topup: { id: process.env.STRIPE_PRICE_ID_TOPUP, mode: 'payment' }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { plan } = req.body || {};
  const item = PRICES[plan];
  if (!item) return res.status(400).json({ error: 'Invalid plan' });
  if (!item.id) return res.status(500).json({ error: 'Payments are not set up yet — check back soon.' });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: item.mode,
      line_items: [{ price: item.id, quantity: 1 }],
      success_url: `${DOMAIN}/?success=true&plan=${plan}`,
      cancel_url: `${DOMAIN}/`
    });
    return res.status(200).json({ url: session.url });
  } catch (e) {
    return res.status(500).json({ error: 'Checkout failed — please try again.' });
  }
}
