// api/get-plan.js
// Retrieves a user's plan and wallet from Vercel KV
// Called on every app load when user is signed in

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://trystellarai.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const url   = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    // KV not set up yet — return free plan so app still works
    return res.json({ plan: 'free', walletPence: 0 });
  }

  try {
    const key = 'stellar:user:' + email.toLowerCase().trim();
    const r   = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await r.json();
    if (data.result) {
      return res.json(JSON.parse(data.result));
    }
    return res.json({ plan: 'free', walletPence: 0 });
  } catch (e) {
    return res.json({ plan: 'free', walletPence: 0 });
  }
}
