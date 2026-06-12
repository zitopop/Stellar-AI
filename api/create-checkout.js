// Stripe Checkout via REST API — no npm package needed
export default async function handler(req, res) {
  // HEALTH CHECK: open this URL in a browser to see which Stripe settings are loaded
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      pricesAutomatic: true,
      hint: 'Plans and wallet create their prices automatically — only STRIPE_SECRET_KEY is needed. After adding it, Redeploy.'
    });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeKey) {
    return res.status(200).json({ error: 'Payments not set up yet (missing STRIPE_SECRET_KEY).' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  // Billing portal: lets a subscriber cancel/update card on Stripe's own page.
  // Returns {url} only once we can identify their Stripe customer (needs the accounts backend).
  // Until then it returns {} and the app shows an honest manual-cancel message.
  if (body && body.mode === 'portal') {
    return res.status(200).json({});
  }
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
    // Subscriptions work like the wallet: the price is created automatically.
    // No STRIPE_PRICE_ID setup needed — only the secret key.
    const tier = body.mode === 'ultimate' ? 'ultimate' : body.mode === 'max' ? 'max' : 'pro';
    const names = { pro: 'Stellar AI Pro', max: 'Stellar AI Max', ultimate: 'Stellar AI Ultimate' };
    const descs = {
      pro: 'Power model · bigger message bar · 4-hour refills · all themes + custom colour · AI personality',
      max: 'Ultra model (Claude Fable 5) · biggest message bar · 2-hour refills · HD images · Nebula theme',
      ultimate: '300% bigger message bar · hourly refills · 2x the Ultra usage of Max'
    };
    const amounts = { pro: '1000', max: '3000', ultimate: '5000' };
    form.append('mode', 'subscription');
    form.append('line_items[0][price_data][currency]', 'gbp');
    form.append('line_items[0][price_data][product_data][name]', names[tier]);
    form.append('line_items[0][price_data][product_data][description]', descs[tier]);
    form.append('line_items[0][price_data][unit_amount]', amounts[tier]);
    form.append('line_items[0][price_data][recurring][interval]', 'month');
    form.append('line_items[0][quantity]', '1');
    form.append('success_url', origin + '/?upgraded=' + tier);
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
