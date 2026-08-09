// api/send-welcome.js
// Sends a welcome email when a new user signs up via Resend

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, name } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return res.status(500).json({ error: 'Resend not configured' });
  }

  const displayName = name || email.split('@')[0];

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Stellar AI <support@trystellarai.com>',
        to: [email],
        subject: 'Welcome to Stellar AI 🐢',
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:-0.3px;">✦ Stellar AI</div>
    </div>

    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;">
      <h1 style="font-size:24px;font-weight:900;color:#ffffff;margin:0 0 12px;letter-spacing:-0.5px;">Welcome, ${displayName} 🐢</h1>
      <p style="font-size:15px;color:rgba(255,255,255,0.6);margin:0 0 24px;line-height:1.6;">
        You've got <strong style="color:#10a37f;">£1 free credit</strong> ready to go. That's enough to generate your first complete FiveM script right now.
      </p>

      <div style="margin-bottom:24px;">
        <div style="font-size:11px;font-weight:800;letter-spacing:0.12em;color:rgba(255,255,255,0.3);text-transform:uppercase;margin-bottom:14px;">Try asking Stellar to build</div>
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:14px 16px;font-size:13px;color:rgba(255,255,255,0.7);margin-bottom:8px;">
          "Make a QBCore police job with cuffing, MDT and jailing"
        </div>
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:14px 16px;font-size:13px;color:rgba(255,255,255,0.7);margin-bottom:8px;">
          "Make a QBCore drug system with weed growing and selling"
        </div>
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:14px 16px;font-size:13px;color:rgba(255,255,255,0.7);">
          "Make a Roblox obby with 10 stages and a coin reward"
        </div>
      </div>

      <a href="https://trystellarai.com/app" style="display:block;background:#10a37f;color:#000;font-weight:800;font-size:15px;text-align:center;padding:14px;border-radius:10px;text-decoration:none;">
        Open Stellar AI →
      </a>
    </div>

    <div style="text-align:center;margin-top:24px;">
      <p style="font-size:12px;color:rgba(255,255,255,0.25);margin:0;">
        Stellar AI · <a href="https://trystellarai.com/terms.html" style="color:rgba(255,255,255,0.25);">Terms</a> · <a href="mailto:support@trystellarai.com" style="color:rgba(255,255,255,0.25);">support@trystellarai.com</a>
      </p>
    </div>

  </div>
</body>
</html>
        `,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend error:', data);
      return res.status(500).json({ error: 'Failed to send email', details: data });
    }

    return res.status(200).json({ success: true, id: data.id });

  } catch (err) {
    console.error('Send welcome error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
