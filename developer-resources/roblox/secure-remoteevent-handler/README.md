# Secure Roblox RemoteEvent Reward Handler

A small Luau example showing how to treat every client RemoteEvent call as untrusted input.

## Pattern

The client sends only a reward ID. The server owns:

- the coin amount;
- the target part;
- the maximum interaction distance;
- the cooldown.

The handler also validates the incoming type, confirms the player has a character root, checks server-side distance and clears rate-limit state when the player leaves.

## Setup

Create:

```text
ReplicatedStorage
└── Remotes
    └── ClaimReward (RemoteEvent)

Workspace
└── DailyRewardPad (Part)
```

Place `ServerScript.lua` in `ServerScriptService`.

A legitimate local interaction can call:

```lua
game.ReplicatedStorage.Remotes.ClaimReward:FireServer("DailyPad")
```

Do not treat this pattern as a substitute for validating the actual gameplay action on the server.

## Developer workspace

Generate or debug Roblox Luau with Stellar AI:

https://trystellarai.com/?utm_source=github&utm_medium=organic&utm_campaign=secure_roblox_remote
