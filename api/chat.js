// Stellar AI chat backend — health check + real web research tools + voice support
export const maxDuration = 60;

const TOOLS = [
  {
    name: 'web_search',
    description: 'Search the live web for current information: news, weather, prices, recent events, facts that may have changed. Returns top results with titles, URLs and snippets.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'The search query' } },
      required: ['query']
    }
  },
  {
    name: 'get_current_datetime',
    description: 'Get the current date and time.',
    input_schema: { type: 'object', properties: {} }
  }
];

async function runTool(name, input) {
  if (name === 'get_current_datetime') {
    return new Date().toString();
  }
  if (name === 'web_search') {
    const key = process.env.BRAVE_SEARCH_API_KEY;
    if (!key) return 'Web search is not configured (missing BRAVE_SEARCH_API_KEY).';
    try {
      const q = encodeURIComponent((input && input.query) || '');
      const r = await fetch('https://api.search.brave.com/res/v1/web/search?q=' + q + '&count=5', {
        headers: { 'Accept': 'application/json', 'X-Subscription-Token': key }
      });
      if (!r.ok) return 'Search failed with status ' + r.status;
      const data = await r.json();
      const results = ((data.web && data.web.results) || []).slice(0, 5).map(x =>
        '- ' + x.title + ' (' + x.url + ')\n  ' + (x.description || '')
      );
      return results.length ? results.join('\n') : 'No results found.';
    } catch (e) {
      return 'Search error: ' + ((e && e.message) || String(e));
    }
  }
  return 'Unknown tool.';
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      return res.status(200).json({
        status: 'ok',
        hasApiKey: !!process.env.ANTHROPIC_API_KEY,
        hasSearchKey: !!process.env.BRAVE_SEARCH_API_KEY,
        message: 'Backend is alive.'
      });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(200).json({ error: 'ANTHROPIC_API_KEY is missing in Vercel. Add it under Settings → Environment Variables, then redeploy.' });
    }

    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    body = body || {};

    let messages = Array.isArray(body.messages) ? body.messages : [];
    const model = body.model || 'claude-sonnet-4-6';
    let max_tokens = parseInt(body.max_tokens) || 4096;
    if (max_tokens > 8000) max_tokens = 8000;
    if (max_tokens < 100) max_tokens = 100;
    const system = body.system || 'You are Stellar AI, a helpful assistant.';
    const wantsStream = body.stream === true;

    if (!messages.length) {
      return res.status(200).json({ error: 'No messages provided.' });
    }

    // Only offer web-search tools when the latest message hints it needs current info.
    // This keeps normal chats and code requests fast (no tool round-trips).
    const lastMsg = messages.length ? JSON.stringify(messages[messages.length - 1]).toLowerCase() : '';
    const needsTools = /search|latest|news|today|current|2024|2025|2026|weather|price of|who is|what happened|recent/.test(lastMsg);
    const activeTools = needsTools ? TOOLS : [];

    let finalText = '';
    let convo = messages.slice();
    for (let turn = 0; turn < 6; turn++) {
      const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({ model, max_tokens, system, messages: convo, ...(activeTools.length ? { tools: activeTools } : {}), stream: false })
      });
      const data = await apiRes.json().catch(() => null);
      if (!apiRes.ok) {
        const msg = (data && data.error && data.error.message) ? data.error.message : ('Claude API error ' + apiRes.status);
        return res.status(200).json({ error: msg });
      }

      const content = (data && data.content) || [];
      if (data.stop_reason === 'tool_use') {
        // Run every requested tool, feed results back, loop again
        const toolResults = [];
        for (const block of content) {
          if (block.type === 'tool_use') {
            const out = await runTool(block.name, block.input);
            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: String(out).slice(0, 4000) });
          }
        }
        convo = [...convo, { role: 'assistant', content }, { role: 'user', content: toolResults }];
        continue;
      }

      const piece = content.filter(b => b && b.type === 'text').map(b => b.text).join('');
      finalText += piece;
      // If Claude stopped because it hit the length cap, ask it to keep going (up to 2 continuations)
      if (data.stop_reason === 'max_tokens' && turn < 5) {
        convo = [...convo, { role: 'assistant', content: piece }, { role: 'user', content: 'Continue exactly where you left off. Do not repeat anything.' }];
        continue;
      }
      if (!finalText) finalText = 'Hmm, I could not generate that. Please try rephrasing, or ask again.';
      break;
    }
    if (!finalText) finalText = 'I ran out of research steps — please ask again.';

    // Voice & other non-streaming callers get plain JSON
    if (!wantsStream) {
      return res.status(200).json({ content: [{ type: 'text', text: finalText }] });
    }

    // Chat UI gets SSE for the typing effect
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    // Deliver in large chunks so it appears almost instantly (no artificial slow typing)
    const size = 120;
    for (let i = 0; i < finalText.length; i += size) {
      res.write('data: ' + JSON.stringify({
        type: 'content_block_delta',
        delta: { type: 'text_delta', text: finalText.slice(i, i + size) }
      }) + '\n\n');
    }
    res.write('data: ' + JSON.stringify({ type: 'message_stop' }) + '\n\n');
    return res.end();

  } catch (err) {
    try {
      return res.status(200).json({ error: 'Server crashed: ' + ((err && err.message) || String(err)) });
    } catch (e) {
      try { res.end(); } catch (e2) {}
    }
  }
}
