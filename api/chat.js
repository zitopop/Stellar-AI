// Stellar AI chat backend — bulletproof version with built-in health check
export default async function handler(req, res) {
  try {
    // HEALTH CHECK: visiting the URL in a browser (GET) shows if the key is loaded
    if (req.method === 'GET') {
      return res.status(200).json({
        status: 'ok',
        hasApiKey: !!process.env.ANTHROPIC_API_KEY,
        message: 'Backend is alive. If hasApiKey is false, add ANTHROPIC_API_KEY in Vercel and redeploy.'
      });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(200).json({ error: 'ANTHROPIC_API_KEY is missing in Vercel. Add it under Settings → Environment Variables, then redeploy.' });
    }

    // Parse body safely (it can arrive as a string or object)
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    body = body || {};

    const messages = Array.isArray(body.messages) ? body.messages : [];
    const model = body.model || 'claude-sonnet-4-6';
    let max_tokens = parseInt(body.max_tokens) || 2000;
    if (max_tokens > 4096) max_tokens = 4096;
    if (max_tokens < 100) max_tokens = 100;
    const system = body.system || 'You are Stellar AI, a helpful assistant.';

    if (!messages.length) {
      return res.status(200).json({ error: 'No messages provided.' });
    }

    // Call Claude
    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({ model, max_tokens, system, messages, stream: false })
    });

    const data = await apiRes.json().catch(() => null);

    if (!apiRes.ok) {
      const msg = (data && data.error && data.error.message)
        ? data.error.message
        : ('Claude API error ' + apiRes.status);
      return res.status(200).json({ error: msg });
    }

    const text = ((data && data.content) || [])
      .filter(b => b && b.type === 'text')
      .map(b => b.text)
      .join('') || 'No response generated.';

    // Stream the text back as SSE so the typing effect works
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    const size = 4;
    for (let i = 0; i < text.length; i += size) {
      res.write('data: ' + JSON.stringify({
        type: 'content_block_delta',
        delta: { type: 'text_delta', text: text.slice(i, i + size) }
      }) + '\n\n');
    }
    res.write('data: ' + JSON.stringify({ type: 'message_stop' }) + '\n\n');
    return res.end();

  } catch (err) {
    // Never crash — always return a readable error
    try {
      return res.status(200).json({ error: 'Server crashed: ' + ((err && err.message) || String(err)) });
    } catch (e) {
      try { res.end(); } catch (e2) {}
    }
  }
}
