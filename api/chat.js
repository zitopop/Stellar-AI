export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ERROR: ANTHROPIC_API_KEY not found');
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { model, max_tokens, system, messages, stream } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }
    
    const finalModel = model || 'claude-sonnet-4-6';
    const finalMaxTokens = Math.min(max_tokens || 2000, 4096);
    const finalSystem = system || 'You are a helpful AI assistant.';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: finalModel,
        max_tokens: finalMaxTokens,
        system: finalSystem,
        messages: messages,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Claude API error: ${response.status}`, errorText);
      return res.status(response.status).json({ error: `API returned ${response.status}` });
    }

    const data = await response.json();
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');

    if (!text) {
      return res.status(200).json({ content: [{ type: 'text', text: 'No response' }] });
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      const chunkSize = 4;
      for (let i = 0; i < text.length; i += chunkSize) {
        res.write(`data: ${JSON.stringify({type: 'content_block_delta', delta: { type: 'text_delta', text: text.slice(i, i + chunkSize) }})}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ type: 'message_stop' })}\n\n`);
      return res.end();
    }

    return res.status(200).json({ content: [{ type: 'text', text: text }] });

  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
