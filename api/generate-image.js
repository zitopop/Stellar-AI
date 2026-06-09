// Free AI image generation via Pollinations.ai - no API key required
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const { prompt, hd } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid prompt' });
    }
    if (prompt.length > 500) {
      return res.status(400).json({ error: 'Prompt too long (max 500 chars)' });
    }
    
    // Pollinations.ai serves images directly from a URL - no API call needed
    // Smaller = much faster on the free image service; Max plan gets full HD
    const size = hd === true ? 1536 : 768;
    const seed = Math.floor(Math.random() * 1000000);
    const encoded = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=${size}&height=${size}&seed=${seed}&nologo=true&enhance=true`;
    
    return res.status(200).json({ url });
  } catch (err) {
    return res.status(500).json({ error: 'Image generation failed: ' + err.message });
  }
}
