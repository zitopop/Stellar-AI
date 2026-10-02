# Cfx.re release draft — Secure QBCore Reward Example

**Suggested category/tags:** FiveM Releases · script · qbcore · free

## Secure QBCore Reward Event — server-authoritative example

A small open-source QBCore example for developers who want a cleaner pattern for reward events.

### What it demonstrates

- Client sends a reward ID, not an item name or amount.
- Reward catalog stays server-owned.
- Player existence is checked server-side.
- Server-side player distance is validated.
- Per-player/per-reward cooldown reduces event spam.
- Reward amount is defensively bounded.

This is intentionally small so the security decisions are easy to inspect. It is not presented as a complete anti-cheat; real gameplay actions should also be proven on the server where possible.

### Source

GitHub folder:
`developer-resources/fivem/secure-qbcore-reward`

### Requirements

| Item | Details |
|---|---|
| Code accessible | Yes |
| Subscription-based | No |
| Framework | QBCore |
| Requirements | qb-core |
| Support | Community / GitHub |

Before posting, verify the current Cfx.re Releases rules and use only links permitted by the category.
