# Stellar AI Free Promotion Pack

Use these posts only in communities that permit resource sharing or self-promotion. Lead with the free resource itself. Do not mass-post identical copy across unrelated communities.

## Cfx.re — free resource post

### Title
[FREE] Secure QBCore Reward Event — server-authoritative starter pattern

### Body
I made a small free QBCore example for a common security mistake: letting the client decide what reward it receives.

This starter keeps the reward catalogue, amount, location and cooldown on the server. The client sends only a short reward ID.

Included:
- server-owned reward config;
- player existence check;
- server-side distance validation;
- cooldown protection;
- defensive reward bounds;
- MIT license.

Source:
https://github.com/zitopop/Stellar-AI/tree/main/developer-resources/fivem/secure-qbcore-reward

Free tools hub:
https://trystellarai.com/free-tools?utm_source=cfx&utm_medium=community&utm_campaign=secure_qbcore_reward

It is a reference pattern rather than a complete anti-cheat. Test it on a development server and adapt the validation to the actual gameplay action.

## BuiltByBit — free resource listing

### Name
Secure QBCore Reward Event — Free Server-Side Starter

### Short description
A free MIT-licensed QBCore starter that keeps reward amounts, location checks and cooldowns server-authoritative instead of trusting client-supplied values.

### Long description
This resource demonstrates a safer QBCore reward flow for FiveM.

The client submits only a short reward ID. The server owns and validates the reward catalogue, item amount, position, distance limit and cooldown before granting anything.

Good for developers who want a small reference implementation to adapt to jobs, interactions, crafting, collection points or other reward flows.

Source is fully inspectable and MIT licensed.

Project page:
https://trystellarai.com/free-tools?utm_source=builtbybit&utm_medium=community&utm_campaign=secure_qbcore_reward

## Roblox Developer Forum — Community Resources draft

### Title
Open-source server-authoritative RemoteEvent reward handler

### Body
I put together a small Luau example for a pattern that causes a lot of exploitable Roblox code: trusting reward values sent by the client.

The client sends only a reward ID. The server owns the reward amount and target location, validates the argument type, checks the player's server-side distance, applies a per-player cooldown and clears rate-limit state when the player leaves.

Source:
https://github.com/zitopop/Stellar-AI/tree/main/developer-resources/roblox/secure-remoteevent-handler

Free resources:
https://trystellarai.com/free-tools?utm_source=roblox_devforum&utm_medium=community&utm_campaign=secure_roblox_remote

This is intentionally a small pattern rather than a full anti-cheat framework. The important part is keeping authoritative decisions on the server and validating the actual gameplay action.

## Product Hunt launch line

Stellar AI is a focused AI workspace for FiveM and Roblox developers: generate, debug, review and export QBCore, ESX, ox_lib and Roblox Luau code, with free open-source starter resources developers can inspect before trying the product.

Landing:
https://trystellarai.com/?utm_source=producthunt&utm_medium=launch&utm_campaign=stellar_ai_launch

## 15-second short-form script

0–2s: Show the broken or unsafe event.
2–5s: Highlight the client-supplied reward value.
5–9s: Replace it with the server-authoritative free starter.
9–12s: Show the rejected invalid request or safe server check.
12–15s: On-screen CTA: “Free source + AI debugger — trystellarai.com/free-tools”

## Tracking rule

Use a distinct UTM source for each channel:
- cfx
- builtbybit
- roblox_devforum
- youtube
- tiktok
- github
- producthunt

Keep medium as `community`, `organic` or `video` and keep campaign names stable so traffic can be compared later.
