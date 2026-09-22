# Stellar AI Project Index

This repository is organised so active runtime files, docs, tests and archived material stay separate.

## Core public surfaces
- `index.html` — public landing page and pricing entry points.
- `app.html` — main AI workspace, chat, Settings, plans and owner-only UI gates.
- `models.html` — model/tier explanation page.
- `blog.html` and `blog/` — SEO guide library and canonical articles.
- `terms.html` — terms, privacy and policy copy.

## Runtime and server code
- `api/` — Vercel serverless routes for auth, chat, Stripe, account state, search and email.
- `lib/` — shared pricing/profile helpers and public visual/PWA assets.
- `currency.js`, `stellar-*.css`, `stellar-*.js` — app presentation and runtime enhancement layers.
- `sw.js` — service worker and client refresh signalling.

## Product operations
- `docs/REVENUE-OPERATIONS-CHECKLIST.md` — payment, funnel, billing and SEO operating checks.
- `docs/PROJECT-INDEX.md` — this map of active areas.
- `tests/` — regression contracts for pricing, routing, UI, accessibility, billing and releases.
- `scripts/` — maintenance and publishing helpers.

## Keep the repo clean
- Put new public guides in `blog/<slug>.html`, then update `blog.html`, `vercel.json` and `sitemap.xml` in the same commit.
- Put implementation notes in `docs/`; do not leave scratch files at the root.
- Move retired experiments into `archive/` instead of keeping them active.
- Do not change billing, prices, auth, entitlements, secrets or production routing without tests and explicit approval.
