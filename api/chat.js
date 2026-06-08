// Stellar AI chat backend with tool use support
// Gives Claude the ability to search the web and check the date when needed.

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

const ALLOWED_MODELS = [
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-6',
  'claude-sonnet-4-5-20250929',
  'claude-opus-4-7',
  'claude-opus-4-6',
  'claude-opus-4-8'
];

const TOOLS = [
  {
    name: 'web_search',
    description: 'Search the live web for current information. Use ONLY when the user asks about something time-sensitive that you may not know: today\'s news, current weather, recent events, prices, specific recent products, sports scores, stock prices, or facts that may have changed since your training. Do NOT use for general knowledge, math, coding, creative writing, definitions, or historical facts you already know — just answer those directly.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Short focused search query, 3-7 words'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'get_current_datetime',
    description: 'Get the current date and time in UTC. Use when the user asks what day or time it is, how long ago something was, or you need today\'s date to give a relevant answer.',
    input_schema: {
      type: 'object',
      properties: {}
    }
  }
];

async function executeToolCall(name, input) {
  try {
    if (name === 'get_current_datetime') {
      const now = new Date();
      return `Current date and time (UTC): ${now.toUTCString()}\nISO: ${now.toISOString()}`;
    }

    if (name === 'web_search') {
      const apiKey = process.env.BRAVE_SEARCH_API_KEY;
      if (!apiKey) {
        return 'Web search is not configured on this server. The user needs to set BRAVE_SEARCH_API_KEY in their Vercel environment variables. Tell them this if relevant; otherwise just answer without searching.';
      }
      const query = (input && input.query) || '';
      if (!query) return 'No query provided.';
      
      const r = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
        {
          headers: {
            'Accept': 'application/json',
            'X-Subscription-Token': apiKey
          }
        }
      );
      
      if (!r.ok) return `Search failed with status ${r.status}.`;
      
      const data = await r.json();
      const results = ((data.web && data.web.results) || []).slice(0, 5);
      
      if (!results.length) return `No search results found for "${query}".`;
      
      return `Web search results for "${query}":\n\n` + results.map((res, i) => 
        `[${i+1}] ${res.title}\nURL: ${res.url}\n${res.description || ''}`
      ).join('\n\n');
    }

    return 'Unknown tool: ' + name;
  } catch (e) {
    return 'Tool error: ' + e.message;
  }
}

async function callClaude(apiKey, body) {
  const r = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION
    },
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Claude API ${r.status}: ${text}`);
  }
  return r.json();
}

function sseChunk(text) {
  return `data: ${JSON.stringify({
    type: 'content_block_delta',
    delta: { type: 'text_delta', text }
  })}\n\n`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured on server.' });

  try {
    let { model, max_tokens, system, messages, stream } = req.body;
    
    if (!model || typeof model !== 'string' || !ALLOWED_MODELS.includes(model)) {
      model = 'claude-sonnet-4-6';
    }
    if (!max_tokens || typeof max_tokens !== 'number') max_tokens = 2000;
    if (max_tokens > 4096) max_tokens = 4096;
    if (max_tokens < 100) max_tokens = 100;
    if (!messages || !Array.isArray(messages)) messages = [];
    if (!system) system = 'You are Stellar AI, a helpful assistant.';
    
    // Tool use loop — let Claude decide when to call tools
    let conversation = [...messages];
    let iterations = 0;
    const MAX_ITERATIONS = 4;
    let finalText = '';
    
    while (iterations < MAX_ITERATIONS) {
      iterations++;
      
      const data = await callClaude(apiKey, {
        model,
        max_tokens,
        system,
        messages: conversation,
        tools: TOOLS,
        stream: false
      });
      
      if (data.stop_reason === 'tool_use') {
        // Add the assistant turn (with tool_use blocks) to conversation
        conversation.push({ role: 'assistant', content: data.content });
        
        // Execute every tool the assistant asked for
        const toolResults = [];
        for (const block of data.content) {
          if (block.type === 'tool_use') {
            const result = await executeToolCall(block.name, block.input);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: result
            });
          }
        }
        
        // Send the results back as the next user turn
        conversation.push({ role: 'user', content: toolResults });
        continue;
      }
      
      // No more tool calls — extract the final text
      finalText = (data.content || [])
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('');
      break;
    }
    
    if (!finalText) finalText = 'Sorry, no response was generated.';
    
    // Stream the final text back to the client as SSE
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      
      // Send text in small chunks with paced delays for a natural typing effect
      const chunkSize = 3;
      const delayMs = 8;
      for (let i = 0; i < finalText.length; i += chunkSize) {
        res.write(sseChunk(finalText.slice(i, i + chunkSize)));
        // Small delay between chunks creates a smooth typing feel
        if (i % 12 === 0) {
          await new Promise(r => setTimeout(r, delayMs));
        }
      }
      res.write(`data: ${JSON.stringify({ type: 'message_stop' })}\n\n`);
      return res.end();
    }
    
    // Non-streaming response
    return res.status(200).json({ content: [{ type: 'text', text: finalText }] });
    
  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + (err.message || err) });
  }
}
