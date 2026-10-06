# Stellar AI — 10-Hour Launch Sprint

Date: 2026-10-06

## Objective

Finish a launch-ready Stellar AI experience without expanding scope. The goal is a product that a new visitor can understand, try, pay for, and return to.

## Definition of done

- Public homepage explains the full Stellar ecosystem without feeling cluttered.
- App home is calm, chat-first, mobile-safe and easy to understand.
- Core customer routes load.
- Sign-in works.
- Free chat/debug workflow works.
- Paid plan checkout opens correctly.
- Priority Script Fix and business-service checkouts open correctly.
- Stripe webhook fulfilment remains intact.
- Usage limits are enforced server-side.
- Support, privacy, terms, refunds and status are reachable.
- No launch-blocking production errors.
- No new feature work until all critical items above pass.

## 10-hour order

### Hour 1 — Freeze scope + homepage
- Finish PR #285.
- Homepage: keep all major product areas discoverable.
- Keep one visual system and clear section spacing.
- App home: chat remains the dominant surface.
- Do not add new tools, models or product lines.

### Hour 2 — Sign-in + account
- Test sign in/create account/sign out.
- Test Google/Discord only if configured for production.
- Verify account state survives refresh.
- Confirm private/owner-only controls never appear for normal customers.

### Hour 3 — Core AI
- Test a normal chat prompt.
- Test FiveM QBCore generation.
- Test ESX or ox_lib generation.
- Test Roblox Luau generation.
- Test Debug mode with a real error.
- Confirm provider failures return useful errors rather than hanging.

### Hour 4 — Usage + plans
- Confirm Free allowance behavior.
- Confirm Starter, Plus and Pro limits are server-owned.
- Confirm premium-model gating.
- Confirm hitting an hourly limit does not dispatch a paid model request.

### Hour 5 — Payments
- Test Starter checkout.
- Test Plus checkout.
- Test Pro checkout.
- Test Server Pass checkout.
- Test successful return flow and billing portal.
- Confirm checkout currency/price labels match the website.

### Hour 6 — Revenue services
- Test Priority Script Fix checkout and thank-you/intake.
- Test Website Audit checkout and post-purchase onboarding.
- Test AI Receptionist checkout and onboarding.
- Confirm customer-facing scope/refund wording is visible before payment.

### Hour 7 — Mobile
- iPhone-width app and homepage.
- Sidebar opens/closes correctly.
- Composer is reachable above safe area/keyboard.
- Settings sheet is usable.
- No horizontal overflow.
- Minimum touch targets remain usable.

### Hour 8 — Trust + broken links
- Check homepage, app, plans, support, privacy, terms, refunds and status.
- Check main CTAs do not point to moved/dead pages.
- Keep contact/support identity consistent.
- Remove any claim that cannot be verified.

### Hour 9 — Production validation
- Run repository checks: npm run check.
- Review Vercel build result.
- Review runtime errors.
- Fix only blockers.
- Do not redesign again.

### Hour 10 — Release
- Merge the reviewed launch PR.
- Confirm production deployment is READY.
- Smoke-test homepage, app, plans and all paid checkout entry points.
- Check runtime errors after release.
- Freeze feature work and start customer acquisition.

## Current verified state

- Production homepage: reachable.
- Production app: reachable.
- Production plans: reachable.
- Priority Script Fix: reachable.
- Website Audit: reachable.
- AI Receptionist: reachable.
- Support: reachable.
- Status: reachable.
- Latest checked production deployment: READY.
- Runtime error scan at time of audit: no errors found in the previous 24 hours.

## Rule for this sprint

If a task does not improve activation, payment, reliability, mobile usability, or customer trust, it waits until after launch.
