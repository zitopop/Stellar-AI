# Stellar AI Discord /debug bot

A small Discord gateway bot that exposes one slash command:

`/debug code:<broken FiveM Lua, Roblox Luau, or error log>`

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

Only the `Guilds` gateway intent is used. Message Content is not required because users supply code through the slash-command option.

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

For the £50/month Server Pass pilot, add only verified customer guild IDs to `STELLAR_SERVER_PASS_GUILD_IDS`. Requests from those guilds bypass the free daily counter, while the 6,000-character input cap, provider capacity, safety rules, cooldowns and other abuse controls remain active.

Do not describe Server Pass as “unlimited” or “zero rate limits”.
