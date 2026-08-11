// api/discord-callback.js — Discord OAuth callback
export default async function handler(req, res) {
  const { code, error } = req.query;
  if (error || !code) {
    return res.redirect('/app?auth_error=discord_cancelled');
  }

  const DISCORD_CLIENT_ID     = process.env.DISCORD_CLIENT_ID;
  const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
  const REDIRECT_URI          = process.env.DISCORD_REDIRECT_URI || 'https://trystellarai.com/api/discord-callback';
  const KV_URL                = process.env.KV_REST_API_URL;
  const KV_TOKEN              = process.env.KV_REST_API_TOKEN;

  try {
    // Exchange code for token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return res.redirect('/app?auth_error=discord_token_failed');
    }

    // Get user info
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = await userRes.json();
    if (!user.email) {
      return res.redirect('/app?auth_error=discord_no_email');
    }

    const em = user.email.toLowerCase().trim();

    // Check if user exists in KV, if not create them
    const kvKey = 'stellar:auth:' + em;
    const getRes = await fetch(`${KV_URL}/get/${encodeURIComponent(kvKey)}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
    });
    const getData = await getRes.json();
    const existing = getData.result ? JSON.parse(getData.result) : null;

    if (!existing) {
      // New user - create account and give welcome credit
      const record = {
        discord: true,
        discordId: user.id,
        discordUsername: user.username,
        createdAt: Date.now(),
      };
      await fetch(`${KV_URL}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([['SET', kvKey, JSON.stringify(record)]]),
      });

      // Send welcome email
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Stellar AI <support@trystellarai.com>',
            to: [em],
            subject: 'Welcome to Stellar AI 🐢',
            html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:32px;background:#050505;color:#fff;">
              <div style="font-size:20px;font-weight:900;margin-bottom:24px;">✦ Stellar AI</div>
              <h1 style="font-size:22px;margin-bottom:12px;">Welcome, ${user.username} 🐢</h1>
              <p style="color:rgba(255,255,255,0.6);margin-bottom:24px;">You've got <strong style="color:#10a37f;">£1 free credit</strong> ready. Start generating QBCore scripts now.</p>
              <a href="https://trystellarai.com/app" style="display:block;background:#10a37f;color:#000;font-weight:800;text-align:center;padding:14px;border-radius:10px;text-decoration:none;">Open Stellar AI →</a>
            </div>`,
          }),
        });
      } catch(e) {}
    }

    // Redirect to app with email encoded so the app can sign them in
    const encoded = Buffer.from(em).toString('base64');
    res.redirect(`/app?discord_login=${encoded}&discord_user=${encodeURIComponent(user.username)}&discord_avatar=${user.avatar || ''}&discord_id=${user.id}`);

  } catch (err) {
    console.error('Discord callback error:', err);
    res.redirect('/app?auth_error=discord_failed');
  }
}
