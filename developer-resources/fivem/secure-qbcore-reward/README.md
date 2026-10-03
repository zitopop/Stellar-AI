# Secure QBCore Reward Event

A minimal FiveM/QBCore example that demonstrates a safer server-authoritative reward flow.

## What it prevents

The client does **not** choose the item name or quantity. It submits a short reward ID, while the server validates:

- the reward exists in a server-owned catalog;
- the player object still exists;
- the player's server-side position is close enough;
- the reward is not being spammed inside its cooldown;
- the configured amount stays inside a defensive bound.

This is a pattern example, not a complete anti-cheat. Your real gameplay action should also be proven on the server where possible.

## Install

1. Copy this folder into your server's resources directory.
2. Adjust the coordinates and allowed reward in `config.lua`.
3. Add `ensure secure-qbcore-reward` to `server.cfg`.
4. From the legitimate gameplay interaction, trigger:

```lua
TriggerServerEvent('stellar_secure_reward:server:claim', 'repair_bench')
```

## Developer workspace

Generate or debug QBCore, ESX and ox_lib code with Stellar AI:

https://trystellarai.com/?utm_source=github&utm_medium=organic&utm_campaign=secure_qbcore_reward

Always test generated code on a development server before production use.
