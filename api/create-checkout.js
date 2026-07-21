import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const DOMAIN = 'https://trystellarai.com';

const SUBSCRIPTIONS = {
  lite: process.env.STRIPE_PRICE_ID_LITE,
  pro: process.env.STRIPE_PRICE_ID_PRO
};

function topupPricePence(qty) { return Math.max(50, qty * 3); }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { plan, qty } = req.body || {};

  try {
    if (plan === 'topup') {
      const n = Math.max(10, Math.min(500, parseInt(qty, 10) || 10));
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'gbp',
            unit_amount: topupPricePence(n),
            product_data: { name: `Stellar Top-up — ${n} messages` }
          },
          quantity: 1
        }],
        success_url: `${DOMAIN}/?success=true&plan=topup&qty=${n}`,
        cancel_url: `${DOMAIN}/`
      });
      return res.status(200).json({ url: session.url });
    }

    const priceId = SUBSCRIPTIONS[plan];
    if (!priceId && (plan === 'lite' || plan === 'pro')) {
      return res.status(500).json({ error: 'Payments are not set up yet — check back soon.' });
    }
    if (!priceId) return res.status(400).json({ error: 'Invalid plan' });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${DOMAIN}/?success=true&plan=${plan}`,
      cancel_url: `${DOMAIN}/`
    });
    return res.status(200).json({ url: session.url });
  } catch (e) {
    return res.status(500).json({ error: 'Checkout failed — please try again.' });
  }
}
