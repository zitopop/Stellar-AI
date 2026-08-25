# Stellar AI Launch Kit

This checklist documents the production configuration required to launch the current Stellar AI plan ladder safely. Complete it in test mode first, verify the Stripe webhooks and server-side entitlements, then switch only the intended production price IDs.

---

## What is live in the current build

| Product area | Current behaviour |
|---|---|
| Platforms | FiveM QBCore, ESX, ox_lib, standalone workflows, and Roblox Luau |
| Default model | Star; Spark and Comet remain available, while Nova is Pro-only |
| Plans | Free, Starter, Plus, and Pro |
| Server enforcement | Requests are metered in Redis per signed-in account per UTC hour; the browser only displays the server snapshot |
| Growth features | Referral links, £1 validated referral rewards, achievement badges, social proof and SEO content |
| Billing safety | Stripe Checkout and webhook confirmation own paid entitlement changes; the browser cannot grant a plan |

> **Do not mark a plan as paid from the browser or by changing local storage.** Billing entitlement changes must arrive through the verified Stripe webhook or an authenticated owner grant.

---

## 1. Create the Stripe price products

Create recurring Stripe prices in the Stripe dashboard for the following plan intervals. Use the exact displayed amount, label each price clearly, and keep test and production price IDs separate.

| Plan | Monthly price | Annual price | Required variables |
|---|---:|---:|---|
| Starter | £8 | £67 | `STRIPE_PRICE_ID_STARTER`, `STRIPE_PRICE_ID_STARTER_ANNUAL` |
| Plus | £20 | £168 | `STRIPE_PRICE_ID_PLUS`, `STRIPE_PRICE_ID_PLUS_ANNUAL` |
| Pro | £75 | £630 | `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_PRO_ANNUAL` |

The Free plan does not require a Stripe product. Keep historic `STRIPE_PRICE_ID_LITE` variables only while existing Plus subscribers still depend on them; new checkout uses the canonical Plus names.

---

## 2. Configure production environment variables

In the Vercel project’s production environment, add or confirm the following values. Never commit real values into the repository.

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
ANTHROPIC_API_KEY
```

Configure a Stripe webhook to the deployed `/api/webhook` route. The signing secret must be stored in `STRIPE_WEBHOOK_SECRET`. A completed checkout should grant the canonical `starter`, `plus`, or `pro` plan only after the webhook verifies the event.

---

## 3. Test every purchase path before launch

Use Stripe test mode and a test account. Confirm the following sequence for every monthly and annual price:

1. Sign in with a non-owner account.
2. Open Plans and start checkout for the intended tier.
3. Complete a Stripe test payment.
4. Confirm the return page shows the correct tier message.
5. Confirm `/api/get-plan` reports the new plan and the correct hourly allowance.
6. Confirm the user can see only the models and features their tier allows; Nova must remain unavailable except on Pro.
7. Confirm an attempted second paid checkout is blocked with the account-management message.
8. Confirm a cancellation leaves the existing access intact until the already-paid period ends.

Use Stripe’s published test card details only in test mode. Do not use a real card to test a production configuration unless you intentionally want a real charge.

---

## 4. Verify the plan contract

| Plan | Requests per hour | Core product promise |
|---|---:|---|
| Free | 40 | £1 credit, no card, Spark/Star/Comet, full scripts and downloads |
| Starter | 120 | 3× usage, priority queue, longer scripts, cancel anytime |
| Plus | 400 | 10× usage, full game systems, priority access, cancel anytime |
| Pro | 1,600 | 40× usage, Nova, complete games, fastest access, cancel anytime |

All request limits are enforced by `api/chat.js` through Redis. The Settings usage display must show requests remaining and reset time from the server response; it is informational and must not be treated as the authority for access control.

---

## 5. Verify referrals, achievements, and public counters

Create two test accounts and validate the complete growth loop:

1. Copy the first account’s Settings referral link.
2. Open it in a clean browser session and sign up as the second account.
3. Confirm that each eligible account receives exactly £1 promotional credit once.
4. Confirm the referral claim is stored under `stellar:referral:email:<email>` and that a repeat sign-up cannot duplicate the reward.
5. Generate scripts and confirm the first-script, 10-scripts and 50-scripts badge progression.
6. Complete a paid checkout and confirm the first-upgrade badge.
7. Confirm landing counters only show aggregate data and remain blank rather than inventing a number if storage is unavailable.

---

## 6. Release checklist

- [ ] Test and production Stripe prices are not mixed.
- [ ] Stripe webhook signing secret is configured and verified.
- [ ] Starter monthly and annual price IDs are configured.
- [ ] Server-side request limits are correct for Free, Starter, Plus and Pro.
- [ ] Nova is Pro-only for non-owner accounts.
- [ ] Owner access works only for `deadlyfox10@gmail.com` and `tobi@trystellarai.com`, plus any deliberately configured additional owners.
- [ ] Referral awards cannot be self-awarded or duplicated.
- [ ] The landing, app, terms, README and sitemap show the same four plans.
- [ ] The EnderDevelopment comparison and affiliate page are listed in the sitemap and linked from public navigation.
- [ ] A mobile review confirms bottom-sheet dialogs, 44px close targets, readable plan text and an unobstructed iPhone composer.
- [ ] Run `node --test tests/*.test.mjs` and resolve all failures before merging.

---

## If something breaks

If checkout reports a missing price, check the exact environment-variable name and the correct Stripe mode, then redeploy. If a payment completes but the plan does not change, check the Stripe webhook delivery log and signing secret before altering any account record. If the usage display looks wrong, inspect the `api/get-plan` response and the hourly Redis key; do not attempt to repair access from browser storage.

© 2026 Stellar AI
