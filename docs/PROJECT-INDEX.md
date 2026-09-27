# Stellar AI project index

Use this page as the quick navigation map. For filing rules, use [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md).

## Product

- `index.html` — landing and conversion entry point.
- `app.html` — main AI workspace.
- `models.html` — model/tier information.
- `blog.html` + `blog/` — guide library and articles.
- `services/` — canonical business-service pages.
- `desktop-agent/` — desktop integration.
- `roblox-studio-plugin/` — Roblox Studio integration.
- `codex/` — work-agent/Codex functionality.

## Runtime

- `api/` — serverless API routes.
- `lib/` — shared runtime/server modules.
- `lib/assets/` — browser/PWA assets.
- `sw.js` — service worker.
- `vercel.json` — production routing.

## Engineering

- `tests/` — regression and contract tests.
- `scripts/` — build, audit and deployment utilities.
- `.github/workflows/` — CI and deploy workflows.

## Operations and docs

- `docs/README.md` — documentation index.
- `docs/DEPLOYMENT_CHECKLIST.md` — release checks.
- `docs/APP_UI_MAINTENANCE.md` — app UI stability rules.
- `docs/REVENUE-OPERATIONS-CHECKLIST.md` — revenue operations.
- `docs/SEO-PUBLISHING-QUEUE.md` — SEO/content queue.
- `docs/history/` — old incident and migration notes.
- `archive/` — retired code/experiments and old operational files.

## Rule of thumb

**If a new file does not need a public root URL, it should not be added to the root.**
