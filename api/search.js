// Web Search (Brave Search API)
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ 
      error: 'Web search not set up. Get a free Brave Search API key from api.search.brave.com and add BRAVE_SEARCH_API_KEY to Vercel env vars.' 
    });
  }
  
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Missing query' });
    
    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': apiKey
      }
    });
    
    const data = await response.json();
    const results = (data.web?.results || []).slice(0, 5).map(r => ({
      title: r.title,
      url: r.url,
      desc: r.description
    }));
    return res.status(200).json({ results });
  } catch (err) {
    return res.status(500).json({ error: 'Search failed: ' + err.message });
  }
}
