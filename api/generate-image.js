// AI image generation via Pollinations
// Works in two modes:
//  1. If POLLINATIONS_API_KEY is set in Vercel -> server-side fetch with no rate limits (recommended)
//  2. Otherwise -> returns a public URL the browser loads directly (free tier, 1 request at a time)
export const maxDuration = 60;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    const { prompt, hd } = body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid prompt' });
    }
    if (prompt.length > 500) {
      return res.status(400).json({ error: 'Prompt too long (max 500 chars)' });
    }

    const size = hd === true ? 1024 : 768;
    const seed = Math.floor(Math.random() * 1000000);
    const encoded = encodeURIComponent(prompt);
    const key = process.env.POLLINATIONS_API_KEY;

    if (key) {
      // Authenticated server-side generation — no per-IP rate limits
      const apiUrl = `https://gen.pollinations.ai/image/${encoded}?width=${size}&height=${size}&seed=${seed}&nologo=true`;
      const r = await fetch(apiUrl, { headers: { 'Authorization': 'Bearer ' + key } });
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer());
        const mime = r.headers.get('content-type') || 'image/jpeg';
        return res.status(200).json({ url: `data:${mime};base64,${buf.toString('base64')}` });
      }
      // If the keyed request fails, fall through to the public URL below
    }

    // Free/keyless mode: the user's browser loads this URL directly
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=${size}&height=${size}&seed=${seed}&nologo=true`;
    return res.status(200).json({ url, free: true });
  } catch (err) {
    return res.status(200).json({ error: 'Image generation failed: ' + ((err && err.message) || String(err)) });
  }
}
