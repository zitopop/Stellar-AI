# Stellar AI Discord /debug bot

A small Discord gateway bot that exposes one slash command:

`/debug code:<broken FiveM Lua, Roblox Luau, or error log>`

The bot does **not** hold Anthropic/Forge keys. It calls the private Stellar bridge at `/api/discord-debug` with a shared server-side key.

## Requirements

- Node.js 22+
- A Discord application/bot
- `DISCORD_BOT_TOKEN`
- `DISCORD_APPLICATION_ID`
- One strong random `STELLAR_DISCORD_BOT_KEY` configured in both the bot host and the Stellar AI Vercel project
- Optional `DISCORD_GUILD_ID` while testing

Only the `Guilds` gateway intent is used. Message Content is not required because users supply code through the slash-command option.

## Install

```bash
cd discord-debug-bot
npm install
```

Copy `.env.example` into the environment settings of the host. Do not commit real tokens or keys.

## Register /debug

For fast testing, set `DISCORD_GUILD_ID` and run:

```bash
npm run register
```

Remove `DISCORD_GUILD_ID` and run the same command when you want the command registered globally.

## Run

```bash
npm start
```

This is a persistent Discord gateway process, so host it on a long-running Node service, VPS, Railway/Render-style worker, or the existing authorised server. Do not run the gateway process as a Vercel serverless function.

## Production bridge

Set this secret on the Stellar AI Vercel project:

```text
STELLAR_DISCORD_BOT_KEY=<same strong random value used by the bot>
```

The bot defaults to:

```text
https://trystellarai.com/api/discord-debug
```

The bridge rejects requests without the shared key, caps input at 6,000 characters, treats pasted code/logs as untrusted data, and uses Stellar's gaming/debug guidance before returning compact JSON for Discord.
