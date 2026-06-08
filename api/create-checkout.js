// Stripe Checkout - Pro plan
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;
  
  if (!stripeKey || !priceId) {
    return res.status(500).json({ 
      error: 'Stripe not configured. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID to Vercel env vars.' 
    });
  }
  
  try {
    const Stripe = (await import('stripe')).default;
    const stripe = Stripe(stripeKey);
    
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${req.headers.origin || 'https://stellar-ai-code-ai-lol.vercel.app'}/?upgraded=true`,
      cancel_url: `${req.headers.origin || 'https://stellar-ai-code-ai-lol.vercel.app'}/`,
    });
    
    return res.status(200).json({ url: session.url });
  } catch (err) {
    return res.status(500).json({ error: 'Stripe error: ' + err.message });
  }
}
