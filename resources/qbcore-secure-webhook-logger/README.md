# Stellar Secure Webhook Logger for FiveM / QBCore

A small server-only Discord webhook utility with per-player rate limiting, payload length checks, mention suppression and webhook-domain validation.

Built as a free reference resource by [Stellar AI](https://trystellarai.com), a FiveM and Roblox code-generation/debugging workspace.

## Why this version is safer

- The webhook URL stays in a **server-only convar**. Do not use `setr`, because replicated convars can become visible to clients.
- This resource registers **no client-callable NetEvent**. Other server resources call the export after their own permission/state checks.
- Player-backed calls verify that QBCore still has the player before logging.
- Each player source is rate-limited to reduce accidental or exploit-driven webhook spam.
- `@everyone` / `@here` are neutralised and Discord `allowed_mentions` is empty.
- Titles/messages are length-bounded before sending.

## Install

1. Copy the folder into your FiveM `resources` directory.
2. Add the webhook to `server.cfg` as a normal server convar:

```cfg
set stellar_webhook_url "https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN"
ensure qb-core
ensure qbcore-secure-webhook-logger
```

3. Call it only from trusted **server-side** code after validating the action that generated the log:

```lua
local ok, reason = exports['qbcore-secure-webhook-logger']:SendStellarWebhook(
  source,
  'Vehicle purchased',
  ('Player %s bought vehicle %s'):format(source, vehicleModel),
  5793266
)

if not ok then
  print(('Webhook skipped: %s'):format(reason or 'unknown'))
end
```

## Security note

Logging does not make the underlying gameplay event secure. Validate money, inventory, permissions, distance, ownership and cooldowns on the server **before** changing state or calling this logger.

Generated code should be inspected and tested on a development server before production use.

More FiveM/QBCore debugging: https://trystellarai.com/app?mode=debug
