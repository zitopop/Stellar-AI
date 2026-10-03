# Stellar AI activation and retention measurement contract

## Objective

This workstream measures whether a new account reaches the first useful result, returns to use Stellar AI again, and eventually upgrades. It deliberately does not treat email opens, page views, or a signup alone as activation or retention.

> **Core activation event:** an authenticated user receives the first successfully completed Stellar AI generation after sending a build, fix, or review request. A request that is blocked, cancelled, or ends in an API error does not count.

This event is the minimum observable proof that the user used the main product capability and received a result. It is intentionally stricter than `message_sent` and simpler than trying to infer whether code was copied into a game.

## Funnel event taxonomy

| Funnel stage | Event | Definition | Primary metric |
|---|---|---|---|
| Acquisition | `landing_viewed` | A visitor loads the public landing page. This belongs in privacy-safe web analytics rather than account storage. | Visitor count |
| Acquisition | `signup_completed` | A unique account finishes the sign-in or account-creation flow. | Visitor-to-signup rate |
| Activation | `starter_selected` | A signed-in user opens one of the clear project starters or uses a starter query parameter. | Starter-selection rate |
| Activation | `generation_requested` | An authenticated user submits a main chat request. | Signup-to-first-request rate |
| Activation | `generation_completed` | The server returns a non-empty successful generation. The user's first instance is the core activation event. | Activation rate |
| Retention | `workspace_session_started` | A signed-in user begins a new workspace session after at least 30 minutes of inactivity. | Second-session rate |
| Retention | `active_day` | A user has at least one successful generation on a given UTC calendar date. | D1 and D7 retention |
| Conversion | `checkout_started` | The server creates a Stripe Checkout Session. | Activated-to-checkout rate |
| Conversion | `subscription_activated` | A verified Stripe webhook grants a paid entitlement. | Checkout-to-paid conversion |

## Cohort definitions

| Metric | Numerator | Denominator | Time window |
|---|---|---|---|
| Activation rate | New signups with at least one `generation_completed` | New signups | Within 24 hours of signup |
| Second-session rate | Activated users with a second `workspace_session_started` | Activated users | Within 7 days of activation |
| D1 retention | Activated users active on the next UTC day | Activated users with a full next day observed | Calendar day +1 |
| D7 retention | Activated users active on day 7 | Activated users with a full seven-day observation window | Calendar day +7 |
| Activated-to-paid conversion | Activated users who begin Checkout | Activated users | Within 30 days of activation |
| Paid conversion | Users with `subscription_activated` | New signups and activated users, reported separately | Within 30 days of signup or activation |

## Measurement rules

Events must use a hashed or normalized account identifier server-side; never expose user email addresses in public analytics. Event records must be idempotent where the metric represents a first occurrence. All timestamps must be stored in UTC. Counts must be reported as aggregates or anonymous cohorts, not as a public user list.

## First experiment decision rule

No product redesign or retention automation should be started until the funnel baseline exists. After the baseline is available, select only the earliest materially weak conversion step. A single activation hypothesis must state the audience, expected mechanism, one success metric, one guardrail metric, and a measurement window before it is implemented.

## Instrumentation audit — 25 August 2026

The existing product has a partial, server-owned record of the funnel. Every account profile stores `createdAt` and a sign-in source. Every completed streamed generation calls `recordScriptGenerated` after the upstream response has finished, which increments the user’s `scriptCount`, unlocks the first-script milestone, increments an aggregate script counter, and adds an opaque account digest to the active-builder set. This is meaningful core-use evidence, but it does not preserve the user’s first successful-generation timestamp, date-level activity, session boundaries, or cohort membership.

Checkout tracking is more complete but begins late in the funnel. The conversion helper records daily aggregate Checkout starts, completed and cancelled attempts, subscription completions, top-ups, and revenue. It cannot report the relationship between signup, first useful generation, return visits, and payment.

| Capability | Current state | Implication |
|---|---|---|
| Signup timestamp and source | Present in the profile record | New-account cohorts can be measured once aggregate counters are added. |
| Successful-generation count | Present after a completed server response | Existing script count is useful evidence but cannot calculate activation timing or D1/D7 retention. |
| Checkout and payment totals | Present as daily server-side aggregates | Conversion can be measured only after the user reaches Checkout. |
| Session and return activity | Not recorded | Second-session, D1, and D7 retention cannot be calculated. |
| Public web analytics | The configured query returned zero visitors and zero pageviews for the audited period | It cannot be used as an acquisition baseline yet. |
| Custom web events | The configured analytics service rejected the query because custom events require a paid plan | The initial funnel must use the existing server-owned KV store and owner-only aggregate reporting instead. |

The first implementation should therefore add minimal, privacy-preserving server-side funnel events and an owner-only aggregate read path. It should not add email automation or redesign unrelated product surfaces.

## First hypothesis and experiment boundary

> **Hypothesis 1:** the earliest meaningful drop-off is between account creation and the first successful generation, but the current system cannot prove its size or distinguish it from a return-session problem. Adding server-owned aggregate event instrumentation will expose the first weak step without changing the core product experience.

The experiment in this cycle is intentionally **measurement only**. It will add idempotent signup, first successful generation, active-day, and workspace-session markers to the existing server-owned storage, then expose owner-only cohort aggregates. It will not send an email, alter prompts, redesign the onboarding flow, change prices, or claim that a behavioral intervention improved retention.

The first cohort report will be reviewed only after enough post-deployment accounts have had a full 24-hour activation window. D1 and D7 retention will remain explicitly unavailable until their corresponding observation windows have elapsed. The next product hypothesis must target whichever measured transition is weakest, rather than a general UI preference.
