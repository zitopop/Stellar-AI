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
- `ANTHROPIC_API_KEY` for direct Claude fallback in the main chat.
- `BUILT_IN_FORGE_API_URL` + `BUILT_IN_FORGE_API_KEY` for internal OpenAI/Gemini/Grok/Claude gateway routing when enabled.
- `OPENAI_API_KEY` only for features that call OpenAI directly (for example realtime/voice/search code paths); it is not a browser key.

Model-provider credentials must stay server-side. The customer-facing app exposes Stellar Fast/Core/Deep/Max rather than provider model IDs. See `docs/AI_MODEL_ROUTING.md` before changing model defaults or aliases.

Owner call / Jarvis:

- `OWNER_PHONE` in `+44...` format
- `TWILIO_ACCOUNT_SID` full SID starting with `AC`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER` in `+1...` or valid E.164 format
- `JARVIS_PUBLIC_URL=https://trystellarai.com`
- `OPENAI_API_KEY` for bidirectional realtime owner calls
- optional `OWNER_INTERNAL_TOKEN` for server-to-server escalations (falls back to `CALL_BRIDGE_TOKEN` or `CRON_SECRET`)

Urgent reminder scheduling with Upstash QStash:

- `QSTASH_TOKEN`
- `QSTASH_CURRENT_SIGNING_KEY`
- `QSTASH_NEXT_SIGNING_KEY`
- optional `QSTASH_MAX_DELAY_DAYS` (defaults to `7`, matching the QStash Free delay limit; use a higher value only when the QStash plan supports it)

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
- test one realtime owner call and confirm the Twilio media stream connects; on the current Vercel Hobby Fluid Compute limit the live WebSocket segment may run for up to 300 seconds; if it ends, Twilio falls back to speech mode
- with QStash configured, schedule an owner-only urgent reminder a few minutes ahead, confirm the signed `/api/webhook?source=qstash-reminder` delivery, then cancel a second future reminder and confirm it never dispatches
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



## 8. QStash urgent reminder API

The owner-authenticated `/api/broadcast` endpoint exposes three reminder actions without adding another Vercel function:

- `urgentReminderStatus`
- `scheduleUrgentReminder`
- `cancelUrgentReminder`

For scheduling, send a timezone-aware ISO `runAt`, a 12-80 character `requestId`, one supported urgent category, severity `urgent` or `critical`, and a short summary. The server stores private reminder details in Redis and gives QStash only the reminder id plus a nonce. QStash delivers to the existing Stripe/Gmail webhook function using `Upstash-Not-Before`.

The callback verifies the QStash JWT signature against the exact public URL and raw request body before loading the reminder. A durable claim is written before any call attempt, so retried QStash deliveries do not create duplicate phone calls after an uncertain provider handoff.

> After changing any production environment variable in Vercel, create a fresh production deployment so serverless functions receive the new value.
