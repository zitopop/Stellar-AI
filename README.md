# ✦ Stellar AI

**Stellar AI** is the production repository for the public website, AI workspace, API routes, billing surfaces, Jarvis/voice features, SEO content and deployment tooling.

**Live site:** https://trystellarai.com

## Quick start

```bash
npm install
npm run check
npm run build:static
```

- `npm run check` — syntax checks, route audits and regression tests.
- `npm run build:static` — builds the static backup into `dist-static/`.
- `npm run deploy:safe` — runs the existing safe deployment helper.

## Repository map

```text
.github/workflows/       CI and deployment workflows
api/                     Vercel serverless/API routes
blog/                    Canonical SEO guides
codex/                   Codex/work-agent feature files
desktop-agent/           Desktop agent package/runtime files
docs/                    Current project documentation
docs/history/            Superseded and dated recovery notes
lib/                     Shared server/runtime modules
lib/assets/              Browser UI, CSS, JS, images and PWA assets
mobile/                  Mobile-specific project files
public/                  Public/static support files
roblox-studio-plugin/    Roblox Studio plugin source
scripts/                 Build, audit, migration and deploy helpers
services/                Canonical sales/business service pages
tests/                   Regression and contract tests
archive/                 Retired experiments and historical operational files
```

### Root files

The repository root still contains several **live route entry points** such as `index.html`, `app.html`, `blog.html`, `models.html`, `support.html`, `sw.js`, `manifest.json`, `sitemap.xml` and `vercel.json`.

**Do not move those casually.** Vercel routing and old public URLs still depend on them.

New work should normally go into a folder instead of creating another root file.

## Where new things go

| You are adding… | Put it here |
|---|---|
| API endpoint | `api/<name>.js` |
| Shared backend/runtime helper | `lib/<feature>.js` |
| Browser CSS/JS/image | `lib/assets/<feature>/` or an existing asset family |
| Blog/SEO guide | `blog/<slug>.html` |
| Business/sales page | `services/<slug>.html` |
| Test | `tests/<feature>.test.mjs` |
| Build/deploy/audit utility | `scripts/<name>.mjs` |
| Current internal documentation | `docs/<TOPIC>.md` |
| Old incident/recovery note | `docs/history/<date-or-topic>.md` |
| Temporary or retired experiment | `archive/<feature-or-date>/` |
| One-off deploy trigger/history | `archive/ops/deploy-triggers/` |

See **[docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)** for the full rules.

## Main product surfaces

- `index.html` — public landing page.
- `app.html` — main Stellar AI workspace.
- `blog.html` + `blog/` — guide library and canonical articles.
- `services/` — business-service conversion pages.
- `api/` — auth, chat, billing, calls and account/server actions.
- `desktop-agent/` and `roblox-studio-plugin/` — local/tooling integrations.

## Safe change rule

Before publishing public or runtime changes:

```bash
npm run check
npm run build:static
```

Then smoke-test at minimum:

```text
/
/app
/blog
/models
/support
/business
/website-audit
/ai-receptionist
/terms
/privacy
```

Never commit real credentials, API keys, private tokens or customer secrets.

## Documentation

Start with:

- [Documentation index](docs/README.md)
- [Project structure](docs/PROJECT_STRUCTURE.md)
- [Deployment checklist](docs/DEPLOYMENT_CHECKLIST.md)
- [App UI maintenance](docs/APP_UI_MAINTENANCE.md)
- [Stellar Deploy](docs/STELLAR_DEPLOY.md)

## Stack

Static HTML/CSS/JS · Node.js 22 · Vercel Functions · Stripe · Supabase/KV-style storage · web push · GitHub Actions

---

© 2026 Stellar AI
