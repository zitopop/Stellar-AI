# Stellar AI Discord /debug bot

A Discord gateway bot for the Stellar community and Server Pass workflow.

Commands:

- `/debug code:<broken FiveM Lua, Roblox Luau, or error log>` — focused script repair.
- `/sync` — sync the linked Stellar plan role (Free / Starter / Plus / Pro) and Server Pass role.
- `/serverpass` — check or activate a paid Server Pass for the current guild.
- `/support` — create a private support ticket.
- `/ticket-close` — lock a resolved ticket while keeping its support history.
- `/stellar-status` — check bot and Stellar web/API health.
- `/stellar-setup` — administrator-only, non-destructive setup. Use **Server Pass only** for normal FiveM/Roblox/customer guilds, or **Full community hub** for the official Stellar Discord.

When `DISCORD_GUILD_ID` is set, the bot treats that guild as the official Stellar community and checks the full community structure on startup. Other guilds default to the compact **Server Pass only** setup when an administrator runs `/stellar-setup`, so customer servers are not cluttered with Stellar community channels. Existing matching roles/channels are kept; setup does not delete them.

The bot does **not** hold Anthropic/Forge keys. It calls the private Stellar bridge at `/api/generate` with a shared server-side key.

## Requirements

- Node.js 22+
- A Discord application/bot
- `DISCORD_BOT_TOKEN`
- `DISCORD_APPLICATION_ID`
- One strong random `STELLAR_DISCORD_BOT_KEY` configured in both the bot host and the Stellar AI Vercel project
- Optional `DISCORD_GUILD_ID` while testing
- Existing `KV_REST_API_URL` and `KV_REST_API_TOKEN` on the Stellar web project for durable free-usage metering
- Optional `STELLAR_SERVER_PASS_GUILD_IDS` on the Stellar web project: comma-separated Discord guild IDs for verified Server Pass pilot customers

Only the `Guilds` gateway intent is used. Message Content is not required because users supply code and support text through slash-command options. For full setup, role sync and tickets, the bot role needs **Manage Roles** and **Manage Channels**. Keep the bot role above the Stellar plan/support roles it manages. `/stellar-setup` itself is restricted to Discord administrators.

## Install

```bash
cd discord-debug-bot
npm install
```

Copy `.env.example` into the environment settings of the host. Do not commit real tokens or keys.

## Run

The main script is standalone: it registers or updates `/debug` on startup, then starts the gateway bot. Set `DISCORD_GUILD_ID` for fast guild-only testing; omit it for the global command.

```bash
npm start
```

`npm run register` remains available as an optional manual registration command.

This is a persistent Discord gateway process, so host it on a long-running Node service, VPS, Railway/Render-style worker, or the existing authorised server. Do not run the gateway process as a Vercel serverless function.

## Production bridge

Set this secret on the Stellar AI Vercel project:

```text
STELLAR_DISCORD_BOT_KEY=<same strong random value used by the bot>
```

The bot defaults to:

```text
https://trystellarai.com/api/generate
```

The `/api/generate` compatibility route rewrites to the existing private chat debug handler, so it does not add another Vercel function. The bridge rejects requests without the shared key, caps input at 6,000 characters, treats pasted code/logs as untrusted data, and uses Stellar's gaming/debug guidance before returning compact JSON for Discord.


## Free usage and Server Pass

The public Discord `/debug` path allows **2 repairs per Discord user per UTC day**. The bridge meters this server-side in KV; the Discord client cannot grant itself extra requests.

For the £50/month Server Pass pilot, the preferred production path is now dynamic:

1. The buyer connects Discord to the Stellar account that owns the paid Server Pass.
2. A server owner/admin runs `/serverpass action:Activate this server`.
3. The private bridge verifies the linked paid account and stores the guild entitlement in KV.
4. `/debug` checks that durable guild entitlement automatically.
5. Stripe subscription updates/cancellation update the guild entitlement so canceled access stops cleanly.

`STELLAR_SERVER_PASS_GUILD_IDS` remains as a compatibility/manual fallback for already-verified guilds, not the primary activation workflow.

Do not describe Server Pass as “unlimited” or “zero rate limits”.


## Serverless fallback

Stellar also exposes `/api/discord-interactions` on Vercel as a signed Discord Interaction Endpoint. Discord supports receiving slash commands over outgoing HTTPS interactions instead of requiring a permanent Gateway connection.

The serverless path keeps core commands available when the T10/gateway machine is offline:
- `/debug`
- `/serverpass`
- `/sync` (account/entitlement sync always; visual role sync when cloud bot credentials are available)
- `/support` (private Discord ticket when cloud bot credentials are available, otherwise the web support route)
- `/stellar-status`

The endpoint validates Discord's Ed25519 signature before trusting guild/user/permission fields. Command registration uses the existing Discord OAuth application credentials. The OAuth start route performs an idempotent bootstrap attempt so the app can self-heal its command registration and Interaction Endpoint configuration without depending on the gateway host.

The persistent gateway remains useful for richer official-community channel/role automation, but it is no longer intended to be a single point of failure for paid Server Pass debugging.
