# Stellar AI Deployment Checklist

Use this checklist before publishing Stellar AI anywhere new.

## 1. Pick the deployment target

### Static backup host
Use this for public pages only:

- landing page
- sales pages
- blog pages
- support page
- branded 404

Good options:

- GitHub Pages
- Cloudflare Pages
- Netlify
- any simple static hosting bucket

### Full app/API host
Use this for the real app:

- chat/API routes
- Stripe
- Supabase
- Twilio/Jarvis calls
- Gmail/webhooks
- auth/session logic

Good options:

- VPS with Node + reverse proxy
- Docker host
- managed Node server
- Vercel/Render/Fly style platform

## 2. Build and check locally

```bash
npm install
npm run check
npm run build:static
```

The important checks are:

- source syntax check
- public route audit
- automated tests
- static backup build

## 3. Required production environment variables

Never commit real secrets. Add them only in the host dashboard.

Core app/API:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `OPENAI_API_KEY` or model provider key

Owner call / Jarvis:

- `OWNER_PHONE` in `+44...` format
- `TWILIO_ACCOUNT_SID` full SID starting with `AC`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER` in `+1...` or valid E.164 format
- `JARVIS_PUBLIC_URL=https://trystellarai.com`

Optional integrations:

- Gmail OAuth variables
- Quo variables
- Retell variables
- Web push keys

## 4. Public route smoke test

After deploy, open:

- `/`
- `/app`
- `/support`
- `/small-business-ai`
- `/ai-inbox-closer`
- `/ai-receptionist`
- `/business`
- `/blog`
- `/terms`
- `/privacy`
- one fake page like `/missing-test-page`

The fake page should show the Stellar branded 404, not a platform default 404.

## 5. App/API smoke test

Only for a full app/API host:

- sign in
- send one chat message
- open Settings
- test model picker on phone width
- test mic permission and speech fallback
- test Stripe checkout link opens
- test owner call status
- test support buttons

## 6. Rollback plan

Before switching DNS:

- keep Vercel deployment active
- keep old DNS values noted
- publish backup host on a subdomain first, for example `pages.trystellarai.com`
- switch root domain only after smoke tests pass

## 7. Repo tidy rules

Do not move live root files randomly.

Move in batches:

1. document the target path
2. add route/rewrites
3. run `npm run check`
4. publish preview/backup
5. smoke test
6. then remove old duplicate

