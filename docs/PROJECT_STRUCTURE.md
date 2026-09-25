# Stellar AI project structure

This repo is a live product, so the rule is: **document first, move files in safe batches, never randomly drag files around.**

## Current live layout

The current root is a mixed static/Vercel app layout. Some files must stay where they are until routing is migrated carefully.

| Area | Current location | Purpose | Move now? |
|---|---|---|---|
| Main public pages | `*.html` in repo root | Landing, app, pricing/support/business pages | No, not until redirects are ready |
| App UI | `app.html`, `lib/assets/*` | Main Stellar chat/app interface and client scripts | No |
| API routes | `api/*` | Vercel serverless routes for chat, auth, Stripe, calls, metrics | No |
| Shared server code | `lib/*` | Server helpers used by API routes | No |
| Static assets | `lib/assets/*`, `manifest.json`, PWA files | CSS, JS, icons, service worker assets | No |
| Blog pages | `blog/*` and legacy root blog pages | SEO content and redirect targets | Later batch |
| Service pages | `services/*` plus clean route folders | Sales pages and local business pages | Later batch |
| Tests | `tests/*` | Node test runner checks | Keep |
| Scripts | `scripts/*` | Build checks, static backup, migration helpers | Keep |
| Docs | `docs/*` | Project rules, deployment guide, structure map | Yes, expand |

## Target layout

This is the clean direction once redirects are ready:

```text
api/                    Vercel or future server API routes
app/                    Future app shell source, after migration
blog/                   Canonical blog pages
services/               Canonical sales/service pages
lib/                    Shared runtime helpers and assets
docs/                   Internal docs and operating rules
scripts/                Build, check, migration and deploy helpers
tests/                  Automated tests
public/                 Future static public output source if app is rebuilt
archive/                Old experiments kept out of production routing
```

## Where new things go

| New thing | Put it here |
|---|---|
| New API route | `api/<name>.js` |
| Shared API helper | `lib/<feature>.js` |
| CSS/JS/image asset | `lib/assets/<feature-name>.*` |
| New sales page | `services/<slug>.html` plus clean route if needed |
| New blog post | `blog/<slug>.html` |
| New deploy/build helper | `scripts/<name>.mjs` |
| Internal instructions | `docs/<TOPIC>.md` |
| Temporary experiment | `archive/<date-or-feature>/` |

## Cleanup rules

1. Do **not** delete live root `.html` files until their clean route and redirect are tested.
2. Do **not** move `api/`, `lib/`, `app.html`, `vercel.json`, `package.json`, `sw.js`, `manifest.json`, or `sitemap.xml` without a tested migration.
3. Every new public page needs:
   - a canonical URL
   - a title and description
   - a route test or at least a manual URL check
4. Every deployment change should run:

```bash
npm run check
npm run build:static
```

5. Vercel is the production app host for now. `dist-static/` is the backup static site output for our own hosting.

## Next cleanup batches

### Batch 1 — safe docs and backup deploy
- Add repo map.
- Add Stellar Deploy static backup guide.
- Add static backup build script.

### Batch 2 — public page routing
- Ensure all important `.html` pages also work as clean URLs.
- Add friendly `404.html`.
- Keep old URLs working.

### Batch 3 — split public pages from app/API
- Move canonical sales pages to `services/`.
- Keep redirects for old root URLs.
- Generate static backup from canonical pages.

### Batch 4 — full own server
- Move API runtime to a VPS/server only after secrets, logs, HTTPS, backups and rollback are ready.
