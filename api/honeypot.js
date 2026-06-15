// api/honeypot.js
// Catches automated scanners looking for WordPress, .env files, phpMyAdmin etc
// Returns 404 to not encourage further scanning

export default async function handler(req, res) {
  // Log the attempt (visible in Vercel logs)
  console.warn('🚨 Scanner detected:', {
    url: req.url,
    ip: req.headers['x-forwarded-for'] || 'unknown',
    ua: req.headers['user-agent'] || 'none',
    time: new Date().toISOString()
  });
  // Return 404 — don't give them anything useful
  return res.status(404).json({ error: 'Not found' });
}
