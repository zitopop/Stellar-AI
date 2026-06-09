// Stripe Checkout via REST API — no npm package needed
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;

  if (!stripeKey) {
    return res.status(200).json({ error: 'Payments not set up yet (missing STRIPE_SECRET_KEY).' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  const origin = req.headers.origin || 'https://stellar-ai-code-ai-lol.vercel.app';
  const isWallet = body.mode === 'wallet';

  const form = new URLSearchParams();
  form.append('payment_method_types[0]', 'card');

  if (isWallet) {
    let pence = parseInt(body.amount) || 0;
    if (pence < 100) pence = 100; // minimum £1
    form.append('mode', 'payment');
    form.append('line_items[0][price_data][currency]', 'gbp');
    form.append('line_items[0][price_data][product_data][name]', 'Stellar AI wallet credit');
    form.append('line_items[0][price_data][unit_amount]', String(pence));
    form.append('line_items[0][quantity]', '1');
    form.append('success_url', origin + '/?credit=' + pence);
    form.append('cancel_url', origin + '/');
  } else {
    if (!priceId) {
      return res.status(200).json({ error: 'Pro plan not set up yet (missing STRIPE_PRICE_ID).' });
    }
    form.append('mode', 'subscription');
    form.append('line_items[0][price]', priceId);
    form.append('line_items[0][quantity]', '1');
    form.append('success_url', origin + '/?upgraded=true');
    form.append('cancel_url', origin + '/');
  }

  try {
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + stripeKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: form.toString()
    });
    const data = await r.json();
    if (!r.ok) {
      return res.status(200).json({ error: (data.error && data.error.message) || ('Stripe error ' + r.status) });
    }
    return res.status(200).json({ url: data.url });
  } catch (err) {
    return res.status(200).json({ error: 'Checkout error: ' + ((err && err.message) || String(err)) });
  }
}
