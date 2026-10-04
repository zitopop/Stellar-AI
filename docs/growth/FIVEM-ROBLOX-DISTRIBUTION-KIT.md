# Stellar AI — FiveM & Roblox Distribution Kit

This kit turns the developer-growth brief into copy that matches the product that is actually deployed.

## Claims guardrail

Use product proof, not inflated claims.

**Safe to say**
- Stellar AI supports FiveM QBCore, ESX, ox_lib and Roblox Luau workflows.
- Relevant game-development prompts can auto-inject server-authoritative anti-exploit guidance.
- The public workspace can generate/debug code that developers inspect before use.
- Free Discord `/debug` includes 2 repairs per Discord user per UTC day.
- The £50/month Server Pass team add-on can activate one verified Discord guild so it bypasses the free daily Discord counter.
- Provider capacity, safety controls, input-size limits and abuse protection continue to apply.
- Free web access requires no card.

**Do not publish unless the deployed product and legal/privacy text are changed to support it**
- “Trained specifically on QBCore/ESX/Luau.”
- “Zero rate limits” or “unlimited.”
- “Zero code storage” / “we never retain code.”
- “Your code is never sent to model providers.”
- “Automatic AST validation” as a guaranteed production feature.
- A recurring affiliate percentage or cash reward that is not backed by payout terms and tracking.

## B2B Server Pass outreach

**Subject:** Shared FiveM / Roblox debugging for [Server or Studio]

Hey [Name],

I saw [specific project/server detail]. If your developers regularly lose time to F8 errors, broken framework callbacks or unsafe client/server events, I’m testing a small team plan for that workflow.

Stellar AI supports QBCore, ESX, ox_lib and Roblox Luau generation/debugging. Relevant game-development prompts can include server-authoritative validation guidance, and the result stays visible for your developer to inspect before it is used.

The **Server Pass team add-on is £50/month** for one verified Discord guild. It gives the activated server shared `/debug` access without the normal free two-repairs-per-day counter. Provider capacity and abuse controls still apply.

If that fits your team, I can send the onboarding page:
https://trystellarai.com/server-pass

No pressure if it is not useful for your workflow.

— Stellar AI

## Cfx.re / BuiltByBit free-resource post

# Free QBCore secure Discord webhook logger

A small server-only logging utility for QBCore resources.

What it includes:
- server-only webhook configuration through a convar;
- per-player rate limiting;
- payload length validation;
- `@everyone` / `@here` suppression;
- Discord webhook-domain validation;
- no client-callable NetEvent in the logger itself.

The important security rule remains the same: validate money, inventory, permissions, ownership and gameplay state on the server **before** changing state or logging the result.

Source: `resources/qbcore-secure-webhook-logger/`

Built as a free reference utility with Stellar AI:
https://trystellarai.com

## Discord help-channel patterns

Use these only where community rules allow helpful external links. Solve the problem first; the link is secondary.

### FiveM: nil Player

The error usually means the server no longer has a valid QBCore player object at the point you use it.

```lua
local src = source
local Player = QBCore.Functions.GetPlayer(src)
if not Player then return end

-- Validate the requested action here before changing money/items.
```

If the event is client-triggered, also validate the action itself on the server rather than trusting client-supplied reward values.

Optional footer:
> If you want a framework-aware second pass on the full error, Stellar's debugger is at https://trystellarai.com/app?mode=debug

### Roblox: untrusted RemoteEvent arguments

A RemoteEvent should be treated as a request, not proof. The server should decide whether the player is eligible and what authoritative value is changed.

```lua
RemoteEvent.OnServerEvent:Connect(function(player, requestedAction)
    if typeof(requestedAction) ~= "string" then return end

    -- Re-check server-owned state here.
    -- Do not accept currency/reward/ownership as truth from the client.
end)
```

Optional footer:
> For a Luau review with the surrounding ModuleScripts, use https://trystellarai.com/app?mode=debug

## 15-second short-form hooks

### Hook 1 — F8 error
- 0–2s: show the real F8 error: “attempt to index a nil value.”
- 2–5s: paste the error + relevant server snippet into Stellar.
- 5–10s: show the added `GetPlayer` guard and the exact changed line.
- 10–13s: show the staging-server re-test checklist.
- 13–15s CTA: “Paste the error. Inspect the fix. trystellarai.com”

### Hook 2 — unsafe reward event
- 0–3s: show an intentionally unsafe client-supplied reward amount.
- 3–8s: show Stellar moving the decision back to the server and bounding inputs.
- 8–12s: highlight the before/after diff.
- 12–15s CTA: “Build server-authoritative FiveM code — trystellarai.com”

### Hook 3 — Roblox RemoteEvent
- 0–3s: “Your client says it earned 1,000,000 coins. Should the server believe it?”
- 3–9s: show server-owned validation around the RemoteEvent.
- 9–12s: show a rejected invalid request.
- 12–15s CTA: “Review Luau client/server boundaries — trystellarai.com”

## Referral and affiliate rollout

Do **not** publish the proposed 20% recurring affiliate commission yet. The public affiliate page currently avoids promising cash/usage rewards, so a commission claim would get ahead of the implemented payout contract.

Before launching a paid affiliate programme:
1. define attribution windows, qualifying purchases, refunds/chargebacks and self-referral rules;
2. implement durable referral-to-subscription attribution server-side;
3. define payout schedule, minimum payout, identity/tax requirements and fraud controls;
4. publish affiliate terms;
5. only then update public commission copy.

Until then, use the existing creator/referral page for transparent sharing rather than promising a percentage.

## Distribution cadence

- Publish the secure webhook logger as a useful standalone GitHub resource.
- Post it to communities only where self-promotion/resource rules allow it.
- Turn one real, reproducible error pattern into a short video each week.
- Use Search Console and conversion metrics to identify which developer problem pages already get impressions.
- Contact server/studio owners individually with a specific observed use case; avoid bulk unsolicited spam.
- Measure landing → app open → first successful generation → checkout or Server Pass purchase, then improve the weakest step.

Primary product: https://trystellarai.com
Server Pass: https://trystellarai.com/server-pass
