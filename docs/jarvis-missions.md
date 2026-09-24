# Jarvis missions

Jarvis now has an owner-only workspace at `/jarvis`. The existing camera workspace remains at `/jarvis/vision`. This is a bounded research and drafting assistant, not an autonomous revenue guarantee or an unrestricted computer agent.

## What a mission does

Choose customer research, script-product work, operations, or Everything. Everything executes three specialists followed by a reviewer. Customer and product specialists first obtain up to six Brave search results. The reviewer receives the saved specialist drafts and source references. Each specialist makes one bounded Anthropic request. Results are plain text, with separate clickable source links; generated code is not run or deployed.

Progress, source references, attempt counts and token usage are stored in Redis after each stage. A signed-in owner can resume failed work without repeating completed stages. A fenced lease prevents concurrent workers from writing over one another. Creation uses an owner-scoped idempotency key. Cancellation lets an in-flight provider request finish but stops subsequent stages and notifications.

Limits: eight new missions per owner per UTC day, three attempts per specialist, four specialists maximum, 2,500 output tokens per specialist, 30-day record retention, 50 recent missions in the list. There is no unbounded model tool loop. Existing provider charges still apply when a user runs a mission.

## Scheduling and delivery

The authenticated daily Vercel cron checks the oldest queued work and processes at most one available mission per invocation. The UI runs newly created missions immediately and polls only for status. Closing the browser does not create a browser-dependent timer; unfinished persisted work can be resumed manually or by the daily check. This is daily recovery, not continuous or real-time background work. Failed missions require an explicit retry.

Optional email and phone updates are selected per mission. They go only to the authenticated owner's email or the existing configured owner phone. Email uses a provider idempotency key. Notification intent is persisted before the external action, so interrupted requests are never automatically dialled again. Accepted or queued provider responses are not labelled delivered. In-app results remain available even if an update fails. No customer outreach or purchases are performed.

## Configuration

- Existing `KV_REST_API_URL` and `KV_REST_API_TOKEN`: durable storage.
- Existing `ANTHROPIC_API_KEY`: generation. Optional `JARVIS_MISSION_MODEL` overrides the existing Haiku default.
- Existing `BRAVE_SEARCH_API_KEY`: web research.
- `CRON_SECRET`: scheduler authentication; a missing secret fails closed.
- `RESEND_API_KEY` and a verified `RESEND_FROM_EMAIL`: owner email delivery.
- Existing owner-call configuration and successful end-to-end readiness: phone delivery.

Configuration-presence badges are explicitly not connectivity or delivery checks. The last worker timestamp reports a worker invocation, not a claim that all work succeeded. The owner boundary uses signed sessions and `isOwnerEmail`, never a client-provided owner flag. Mission APIs return private/no-store responses. No new public API function is needed: requests are multiplexed through the existing desktop route.

## Research informing the design

This comparison covers representative systems, not every assistant named Jarvis.

- [OpenClaw](https://github.com/openclaw/openclaw) demonstrates a personal assistant connected to multiple communication channels. Stellar reuses its own existing providers rather than installing a second assistant or claiming every channel is connected.
- [Anthropic's multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) explains orchestrated specialists, preserved outputs, checkpoints and recovery. Stellar uses a smaller fixed specialist pipeline with bounded requests and durable progress; it does not claim the same capabilities as that system.
- [n8n's human-in-the-loop tool documentation](https://docs.n8n.io/advanced-ai/human-in-the-loop-tools) distinguishes automation from approval-sensitive actions. These missions produce research and drafts; external publishing, purchases and customer outreach are outside the implemented toolset.
- [Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing) support daily cron on all plans. This implementation uses a daily schedule and does not require upgrading a plan. Hosting and provider usage limits still apply.

## Validation

Behavioral tests cover owner/cron authorization, owner isolation, idempotent creation, durable step recovery, bounded retries, concurrent workers, cancellation, uncertain notifications, malformed provider output and Redis command errors. Browser checks use a separate local fixture server; they do not contact customers, place calls, send mail, or incur model requests. Production provider delivery must be verified separately.
