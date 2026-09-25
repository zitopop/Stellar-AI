# Stellar Deploy

Stellar Deploy is the backup deployment path for Stellar AI. It exists so public pages can still ship when Vercel is blocked by build limits.

## Goal

Keep the real app safe, but make the public website more resilient.

```text
GitHub repo → build static backup → upload to our own host → check key pages
```

## Phase 1: static backup host

This phase is for public pages only:

- landing page
- support page
- business pages
- service pages
- blog pages
- `small-business-ai`
- `ai-inbox-closer`
- branded `404.html`
- static assets

It does **not** replace API routes yet:

- `/api/chat`
- auth/session routes
- Stripe checkout routes
- Twilio/Jarvis call routes
- Gmail/webhook routes

Those stay on Vercel until the full server migration is ready.

## Why phase 1 first

The current blocker is Vercel build-rate-limit. A static backup host solves the urgent public-page problem without risking the AI app, payments or calls.

## Build command

```bash
npm run build:static
```

This creates:

```text
dist-static/
```

That folder can be uploaded to any static host or simple web server.

## Key output routes

The static backup builder makes both file URLs and clean URLs work where possible:

```text
/index.html
/app.html
/support.html
/small-business-ai.html
/small-business-ai/index.html
/ai-inbox-closer.html
/ai-inbox-closer/index.html
/404.html
/blog/...
/services/...
/lib/assets/...
```

## Host options later

Good targets for the static backup output:

- a cheap VPS with Caddy or Nginx
- GitHub Pages for simple public pages
- Cloudflare Pages
- Netlify
- any object storage/static host

## Own full server later

A full own-server migration needs a separate backend plan:

```text
Caddy/Nginx HTTPS reverse proxy
Node API service
PM2 or systemd process manager
GitHub deploy key
Environment secrets file
Stripe webhook endpoint
Twilio/Jarvis call endpoint
Log folder and rotation
Daily backup job
Rollback script
Uptime check
```

Do not move the full API until these are ready.

## Safe deploy checklist

Before uploading `dist-static/`:

```bash
npm run check
npm run build:static
```

Then test these URLs on the backup host:

```text
/
/app.html
/support.html
/small-business-ai/
/ai-inbox-closer/
/404.html
/blog/
```

## Domain plan

Keep `trystellarai.com` on the main app until the backup host is tested. Then either:

1. point a subdomain like `pages.trystellarai.com` to the backup host, or
2. use backup host only during Vercel outages/build blocks, or
3. later move the full domain after API migration.

Recommended first subdomain:

```text
pages.trystellarai.com
```

## What not to do

- Do not paste secrets into GitHub.
- Do not move Stripe/Twilio/Gmail routes to static hosting.
- Do not delete root pages until redirects are tested.
- Do not change DNS for the main domain until the backup host has been checked.
