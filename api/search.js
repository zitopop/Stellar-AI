// Web Search (Brave Search API)
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'Web search not set up. Add BRAVE_SEARCH_API_KEY to the Vercel environment.'
    });
  }

  try {
    const query = String(req.body?.query || '').trim().slice(0, 240);
    const mode = String(req.body?.mode || 'search').toLowerCase() === 'research' ? 'research' : 'search';
    if (!query) return res.status(400).json({ error: 'Missing query' });

    const count = mode === 'research' ? 16 : 8;
    const timeoutMs = mode === 'research' ? 10000 : 6500;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}&extra_snippets=true`, {
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': apiKey,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) return res.status(502).json({ error: 'Search provider request failed.' });

    const strip = (value) => String(value || '').replace(/<[^>]+>/g, '').trim();
    const data = await response.json();
    const results = (data.web?.results || []).slice(0, count).map((result) => ({
      title: strip(result.title),
      url: String(result.url || '').slice(0, 1600),
      desc: strip(result.description),
      extra: Array.isArray(result.extra_snippets) ? result.extra_snippets.slice(0, mode === 'research' ? 5 : 3).map(strip) : [],
    })).filter((result) => result.url);

    return res.status(200).json({ mode, query, results });
  } catch (error) {
    const message = error?.name === 'AbortError' ? 'Search timed out.' : 'Search failed.';
    return res.status(500).json({ error: message });
  }
}
