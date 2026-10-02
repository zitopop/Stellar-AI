// api/discord-interactions.js — Vercel HTTP interaction endpoint for Discord slash commands.
import { EPHEMERAL, processDiscordInteraction, verifyDiscordInteraction } from '../lib/discord-interactions.js';

export const config = { api: { bodyParser: false } };

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      mode: 'discord-serverless-interactions',
      endpoint: '/api/discord-interactions',
      oauthConfigured: Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET),
      bridgeConfigured: Boolean(process.env.STELLAR_DISCORD_BOT_KEY),
      botRoleManagementConfigured: Boolean(process.env.DISCORD_BOT_TOKEN),
    });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const rawBody = await readRawBody(req);
  const signature = Array.isArray(req.headers['x-signature-ed25519']) ? req.headers['x-signature-ed25519'][0] : req.headers['x-signature-ed25519'];
  const timestamp = Array.isArray(req.headers['x-signature-timestamp']) ? req.headers['x-signature-timestamp'][0] : req.headers['x-signature-timestamp'];
  if (!(await verifyDiscordInteraction({ rawBody, signature, timestamp }))) {
    return res.status(401).json({ error: 'Invalid Discord interaction signature.' });
  }

  let interaction;
  try {
    interaction = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Invalid interaction payload.' });
  }

  if (interaction?.type === 1) return res.status(200).json({ type: 1 });
  if (interaction?.type !== 2) return res.status(200).json({ type: 4, data: { content: 'Unsupported interaction.', flags: EPHEMERAL } });

  res.status(200).json({ type: 5, data: { flags: EPHEMERAL } });
  await processDiscordInteraction(interaction).catch((error) => {
    console.error('Discord serverless interaction failed', error?.message || error);
  });
}
