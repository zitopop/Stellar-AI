# Stellar AI Revenue Operations Checklist

Use this checklist after every pricing, billing, onboarding, SEO or checkout change. It keeps revenue work practical: verify the money path, measure the funnel, then publish content that brings qualified builders back to the app.

## 1. Billing portal live test

Run this with a real paid Stellar account only. Do not impersonate another customer and do not paste a customer's Stripe portal URL into chat.

1. Sign in to the paid Stellar account.
2. Open **Settings → Plan → Manage billing**.
3. Confirm the browser redirects to `billing.stripe.com`.
4. Confirm the portal shows only that user's subscription, invoices and payment method.
5. Confirm plan switching is not offered inside the generic portal.
6. Confirm cancellation is at period end, not immediate cancellation.
7. Return to Stellar and confirm the app still shows the same plan.

Expected result: paid users can update card details, view invoices and cancel safely. If the portal fails, keep the support fallback visible: `deadlyfox10@gmail.com`.

## 2. Funnel numbers to check weekly

Track these in order. Fix the earliest weak step first.

| Funnel step | What to look for | Fix if weak |
| --- | --- | --- |
| Landing visit → app open | Visitors are not clicking Start building free | Improve hero CTA, examples and pricing clarity |
| App open → sign-up | Users try the app but do not create accounts | Reduce friction, keep guest-to-account transition clear |
| Sign-up → first successful generation | Users sign up but do not get value | Improve starter prompts, examples and error handling |
| First successful generation → checkout started | Users get value but do not pay | Improve post-build upgrade prompt and plan positioning |
| Checkout started → paid | Stripe starts but payments fail or get abandoned | Check live price IDs, checkout copy, payment failures and recovery emails |
| Paid → second session | Users pay but do not return | Improve recent projects, saved files and continuation prompts |

## 3. Stripe safety checks

Check these after any pricing or checkout edit.

- Starter monthly is £8.
- Starter annual is £67.
- Plus monthly is £20.
- Plus annual is £168.
- Pro monthly is £75.
- Pro annual is £630.
- Top-up credit remains separate from hourly request allowance.
- The app never claims unsupported benefits such as priority queue unless the backend enforces them.
- Stripe customer IDs are stored server-side and never trusted from browser input.

## 4. SEO publishing checklist

Each new guide should target one high-intent problem, not a vague keyword.

Good target examples:

- `fix qbcore nil value error`
- `qbcore script not starting`
- `roblox remoteevent exploit fix`
- `fivem resource manifest error`
- `ox_lib menu not opening qbcore`
- `roblox datastore not saving`

Before publishing:

1. Use one clear problem in the title.
2. Explain what to paste into Stellar AI: code, error, framework, expected behaviour and steps to reproduce.
3. Include safe testing guidance.
4. Link to `/app?welcome=1` with a practical CTA.
5. Add the article to `blog.html`.
6. Add a clean route in `vercel.json`.
7. Add the canonical URL to `sitemap.xml`.
8. Avoid fake testimonials, fake rankings and unsupported claims.

## 5. Weekly owner review

Every week, answer these five questions:

1. Did any checkout route fail?
2. Which funnel step lost the most users?
3. Which guide got impressions but low clicks?
4. Which prompt produced the most successful first builds?
5. What one small change can be shipped safely this week?

## 6. Safe change rule

Ship fast only when the change is safe and reversible. Do not silently change prices, entitlement rules, authentication, legal terms, Stripe products or customer data handling without a specific verification plan.
