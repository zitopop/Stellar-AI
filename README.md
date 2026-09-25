# ✦ Stellar AI

AI workspace and business assistant for Stellar AI. It includes the public site, chat app, sales/SEO pages, API routes, billing, voice/Jarvis work, and deployment tooling.

**Live at [trystellarai.com](https://trystellarai.com)**

---

## Fast commands

```bash
npm install
npm run check
npm run build:static
```

- `npm run check` runs syntax checks, public-route audits and tests.
- `npm run build:static` builds `dist-static/`, a clean public backup site for Stellar Deploy.
- `npm run deploy:safe` runs the existing safe deployment helper.

---

## What it does

- Chat-style AI workspace for users
- Script and project help for FiveM, Roblox and business workflows
- Public sales pages for small business AI, AI receptionist and inbox closer offers
- Stripe plan and credit flow support
- Owner/Jarvis call configuration work
- Voice input and voice reply UI work
- SEO/blog pages and sitemap surfaces
- Static backup deployment tooling so public pages are not trapped behind one host

---

## Repo structure

```text
api/                         Backend/API routes
lib/                         Shared runtime modules and visual/PWA assets
lib/assets/                  App/browser assets loaded by public pages
services/                    Service/sales pages served through clean routes
blog/                        Published SEO/blog content
scripts/                     Build, audit, migration and deployment helpers
docs/                        Project rules, deployment docs and operating notes
tests/                       Regression and contract tests
archive/                     Retired/legacy material kept away from active files
small-business-ai/           Clean URL source for /small-business-ai
ai-inbox-closer/             Clean URL source for /ai-inbox-closer
.github/workflows/           GitHub Actions for checks and static deploys
```

Root HTML files are still used by the live site. Do **not** randomly move them. Move files only in safe batches with redirects/rewrites and route audits.

More detail:

- [`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md)
- [`docs/STELLAR_DEPLOY.md`](docs/STELLAR_DEPLOY.md)
- [`docs/DEPLOYMENT_CHECKLIST.md`](docs/DEPLOYMENT_CHECKLIST.md)

---

## Stellar Deploy

Stellar Deploy starts as a static backup system for public pages:

```text
GitHub → route audit → build static backup → publish to backup host
```

Current tooling:

- `scripts/build-static-backup.mjs` builds `dist-static/`
- `scripts/audit-public-routes.mjs` checks clean public routes and internal links
- `.github/workflows/stellar-static-backup.yml` builds a downloadable static artifact
- `.github/workflows/stellar-pages-static.yml` can publish the static backup through GitHub Pages after Pages is enabled for GitHub Actions

Use the static backup for public pages first. Keep the full app/API on Vercel or another Node host until environment variables, HTTPS, logs, rollback and secrets are ready.

---

## Built with

Static HTML/CSS/JS · Vercel serverless functions · AI API · Stripe payments · Google + Discord sign-in · Supabase/KV style storage · web push · GitHub Actions

---

## Plans

| Plan | Monthly | Annual | Included |
|------|---------|--------|----------|
| Free | £0 | £0 | 40 requests/hour · up to 2,000 output tokens · £1 starting credit · Spark and Star |
| Starter | £8/mo | £67/yr · save £29 (30%) | 120 requests/hour · up to 3,500 output tokens · stronger context and deliberate self-review · Spark and Star |
| Plus | £20/mo | £168/yr · save £72 (30%) | 400 requests/hour · up to 5,000 output tokens · deeper architecture/debugging and multi-file validation · Spark, Star and Comet |
| Pro | £75/mo | £630/yr · save £270 (30%) | 1,600 requests/hour · up to 8,000 output tokens · Nova · maximum multi-pass engineering review |

---

## Required production environment variables

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
KV_REST_API_URL
KV_REST_API_TOKEN
JWT_SECRET
```

Owner call / Jarvis variables:

```text
OWNER_PHONE=+44...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1...
JARVIS_PUBLIC_URL=https://trystellarai.com
```

Optional production values:

```text
STRIPE_BILLING_PORTAL_CONFIG_ID
CRON_SECRET
RESEND_API_KEY
RESEND_FROM_EMAIL
GOOGLE_CLIENT_ID
DISCORD_CLIENT_ID
DISCORD_CLIENT_SECRET
DISCORD_REDIRECT_URI
GMAIL_CLIENT_ID
GMAIL_CLIENT_SECRET
```

Never commit real secrets.

---

## Safe change rule

Before a public deploy:

```bash
npm run check
npm run build:static
```

Then smoke test:

```text
/
/app
/support
/small-business-ai
/ai-inbox-closer
/ai-receptionist
/business
/blog
/terms
/privacy
/missing-test-page
```

The missing page should show the branded Stellar 404.

---

© 2026 Stellar AI
