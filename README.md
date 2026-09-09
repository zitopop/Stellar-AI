# ✦ Stellar AI

AI script generator for FiveM (QBCore) and Roblox server owners. Describe what you need in plain English — get the script plus the fxmanifest, ready to drop into your resources folder.

**Live at [trystellarai.com](https://trystellarai.com)**

---

## What it does

- Generates complete Lua scripts for FiveM (QBCore, ESX, ox_lib, standalone) and Roblox
- Fixes and improves broken or incomplete scripts
- Four AI models: Spark (fast), **Star (the default)**, Comet (advanced), and Nova (Pro only)
- Login with Google, Discord, or an email account
- Workspace panel — every generated script becomes a downloadable file
- Server-side, per-account hourly request enforcement with usage remaining and reset-time display
- Referral links: eligible referrer and new user both receive £1 promotional credit after a validated sign-up
- Achievement badges for first script, 10 scripts, 50 scripts, and first paid upgrade
- Installable as an app on phone, tablet and desktop
- Free, Starter (£8/mo or £67/yr), Plus (£20/mo or £168/yr), and Pro (£75/mo or £630/yr) plans

---

## Built with

Static HTML/CSS/JS · Vercel serverless functions · AI API · Stripe payments · Google + Discord sign-in · Resend email

---

## Structure

```text
index.html          landing page, plan comparison and first-run entry points
app.html            authenticated/guest AI workspace and in-app plan modal
blog.html           Guides hub
blog/               published FiveM and Roblox guides at canonical clean routes
models / models.html model directory/SEO route pair
api/                serverless auth, chat, billing, search, email and account APIs
lib/                shared runtime modules and visual/PWA assets
docs/               product, release and implementation documentation
scripts/            repository maintenance and publishing helpers
tests/              regression, routing, pricing, accessibility and release contracts
archive/            retired/legacy material kept away from active runtime files
site-polish.css     shared dark public-page polish used by legacy content pages
manifest.json       installable app configuration
sw.js               service worker
vercel.json         hosting routes, redirects, rewrites and security headers
sitemap.xml         canonical public discovery URLs
terms.html          terms and privacy information
affiliate.html      FiveM server-owner and sharing information
```

Route-critical public files stay in their existing locations. Add new active code to the matching folder above; move retired material to `archive/` instead of leaving temporary files at repository root.
---

## Plans

| Plan | Monthly | Annual | Included |
|------|---------|--------|----------|
| Free | £0 | £0 | 40 requests/hour · £1 credit · Spark, Star and Comet |
| Starter | £8/mo | £67/yr | 120 requests/hour · priority queue · longer scripts |
| Plus | £20/mo | £168/yr (£14/mo) | 400 requests/hour · full game systems |
| Pro | £75/mo | £630/yr (£52.50/mo) | 1,600 requests/hour · Nova · complete games |

---

## Required environment variables

The server routes validate billing and entitlements independently of the browser. Configure these values in the production environment before enabling paid checkout:

```text
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_ID_STARTER
STRIPE_PRICE_ID_STARTER_ANNUAL
STRIPE_PRICE_ID_PLUS
STRIPE_PRICE_ID_PLUS_ANNUAL
STRIPE_PRICE_ID_PRO
STRIPE_PRICE_ID_PRO_ANNUAL
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
JWT_SECRET
```

`STRIPE_PRICE_ID_STARTER` and `STRIPE_PRICE_ID_STARTER_ANNUAL` are required for the Starter checkout path. User plan, request allowance, Nova access, referral credit and achievement state are resolved server-side; do not treat browser storage as an entitlement source.

---

© 2026 Stellar AI
