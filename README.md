# Stellar AI

Stellar AI is an AI-assisted development workspace for building, organising, testing and refining Roblox Luau and FiveM/QBCore systems from plain-English requests. The web app combines project-oriented chat, selectable model power, account usage controls and Stripe-backed paid plans while keeping the public guides and product pages directly accessible.

**Live:** https://trystellarai.com

## Features

- Roblox Luau and FiveM/QBCore code generation
- Organised project files and project-based chat history
- Fast, Balanced, Deep and Max model-power modes
- Free and paid usage allowances with optional credit top-ups
- Google and Discord sign-in
- Stripe subscription and billing flows
- Web search support for eligible requests
- Installable PWA with mobile icons, splash screens and offline fallback
- Public FiveM, QBCore and Roblox guide library

## Tech stack

- Static HTML, CSS and vanilla JavaScript frontend
- Node.js Vercel Functions in `api/`
- Vercel hosting and PWA service worker
- Stripe for subscriptions, checkout and webhooks
- Redis-compatible REST/KV storage for account and usage state
- Google and Discord authentication
- Resend for transactional email
- Anthropic and configured AI/Forge providers
- Brave Search API for web-search requests

## Folder structure

```text
Stellar-AI/
├── api/                 # Vercel serverless API handlers
├── assets/
│   ├── css/             # Shared product stylesheets
│   ├── icons/           # PWA/app icons and favicon
│   ├── img/             # Product/social images
│   ├── js/              # Shared browser JavaScript
│   ├── splash/          # PWA launch images
│   └── styles.css       # Cacheable primary app stylesheet
├── blog/                # Canonical published guide pages
├── lib/                 # Shared server/runtime modules and auxiliary pages
├── scripts/             # Active maintenance/validation scripts
├── tests/               # Node test suite
├── archive/             # Superseded docs, source files and tooling
├── index.html           # Public landing page
├── app.html             # Main Stellar AI application
├── blog.html            # Guide index
├── affiliate.html       # Affiliate page
├── terms.html           # Terms and privacy
├── offline.html         # PWA offline fallback
├── manifest.json        # Web app manifest
├── sw.js                # Service worker
└── vercel.json          # Hosting routes and redirects
```

## Local setup

1. Install Node.js 22 or newer.
2. Run `npm install`.
3. Create a local `.env` file with the required variables listed below.
4. Start the Vercel-compatible local environment with `npx vercel dev`.
5. Run the test suite with `node --test tests/*.test.mjs`.

Static pages can be inspected without API credentials, but authentication, AI, search, storage, email and billing flows require their corresponding environment variables.

## Environment variables

Names only; never commit secret values.

- `ANTHROPIC_API_KEY`
- `AUTH_SESSION_SECRET`
- `BRAVE_SEARCH_API_KEY`
- `BUILT_IN_FORGE_API_KEY`
- `BUILT_IN_FORGE_API_URL`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI`
- `DISCORD_STATE_SECRET`
- `GOOGLE_CLIENT_ID`
- `KV_REST_API_TOKEN`
- `KV_REST_API_URL`
- `OWNER_EMAIL`
- `OWNER_EMAILS`
- `OWNER_SECRET`
- `RESEND_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Licence

MIT — see [`LICENSE`](./LICENSE).
