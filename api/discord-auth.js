// api/discord-auth.js — Discord OAuth login
// Add these to Vercel env vars:
// DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI=https://trystellarai.com/api/discord-callback

export default async function handler(req, res) {
  const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  if (!DISCORD_CLIENT_ID) {
    return res.status(500).json({ error: 'Discord not configured' });
  }
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: process.env.DISCORD_REDIRECT_URI || 'https://trystellarai.com/api/discord-callback',
    response_type: 'code',
    scope: 'identify email',
  });
  res.redirect(`https://discord.com/oauth2/authorize?${params}`);
}
