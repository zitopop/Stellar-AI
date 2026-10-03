# AI model routing

Last verified: 2 October 2026.

Stellar AI exposes **Stellar capability tiers** to customers and keeps third-party provider/model IDs private. Customers choose a Stellar tier; server-side routing can change providers for quality, reliability, latency, cost, safety, or availability without changing the customer-facing contract.

## Customer-facing contract

| Public name | Internal tier ID | Typical use |
|---|---|---|
| Stellar Fast | `spark` | Quick questions, rewrites, lightweight tasks |
| Stellar Core | `star` | Default chat, writing, coding and everyday problem solving |
| Stellar Deep | `comet` | Larger code, research and multi-step projects |
| Stellar Max | `nova` | Highest public capability for intensive work |

Do not expose provider model names in the public picker, plan cards, upgrade copy, checkout metadata, customer capability payloads, or marketing claims.

## Current provider catalog

The model IDs below are server-side implementation details. Availability still depends on the configured provider/gateway account.

### OpenAI

Current GPT-6 family used/recognised internally:

- `gpt-6-luna` — fast/cost-efficient internal option.
- `gpt-6-sol` — deeper planning/review/security option.
- `gpt-6-astra` — highest-cost frontier option; recognised internally but not required for the public Max tier.

Legacy `gpt-6.1-sol` is accepted only as an internal backwards-compatibility alias and resolves to `gpt-6-sol`.

Official source: https://platform.openai.com/pricing

### Anthropic / Claude

Current Claude lineup used by Stellar:

- `claude-haiku-4-5-20251001`
- `claude-sonnet-5-5`
- `claude-opus-5-5`
- `claude-fable-5-1`

Older Claude aliases remain recognised only where needed for backwards compatibility. New routing/defaults should use the current lineup.

Official source: https://platform.claude.com/docs/en/models/overview

### Google / Gemini

- `gemini-3.8-flash` — current stable general-purpose Gemini model used for internal research routing.
- Older Gemini preview IDs can remain compatibility aliases but should not be used as new public or default product labels.

Official source: https://ai.google.dev/gemini-api/docs/models

### xAI / Grok

- `grok-4.7` — current flagship model used for internal gaming/agentic coding routing.

Official source: https://docs.x.ai/developers/models

## Routing principles

- Public requests may specify only `spark`, `star`, `comet`, or `nova`.
- Provider IDs are never a paid-plan entitlement.
- Specialist modes can choose an internal provider model best suited to the task.
- General chat honours the Stellar tier selected by the customer.
- If an internal gateway/provider rejects an eligible route, Stellar should fall back to an allowed current model rather than expose provider errors or silently unlock a higher paid tier.
- Never claim OpenAI, Anthropic, Google, xAI, or another provider sponsors, endorses, partners with, or owns Stellar AI unless a written agreement actually establishes that.
- Never put provider API keys in browser code or the repository.

## Current specialist routing

- Planning / review / security: GPT-6 Sol through the internal compatible gateway when configured.
- Research: Gemini 3.8 Flash through the internal compatible gateway when configured.
- Gaming / agentic coding: Grok 4.7 through the internal compatible gateway when configured.
- Implementation / testing / direct fallback: current Claude models.
- Voice/realtime features can use their own explicitly configured voice model and are separate from the public text-tier picker.

## Configuration

Main chat can use:

- `ANTHROPIC_API_KEY` for direct Claude fallback.
- `BUILT_IN_FORGE_API_URL` + `BUILT_IN_FORGE_API_KEY` for the OpenAI-compatible multi-provider gateway.

Other features may separately use `OPENAI_API_KEY` for voice, realtime, search/TTS, or other explicitly coded OpenAI endpoints.

Direct Google or xAI keys are not required by the current main-chat architecture because Gemini/Grok routes go through the configured internal gateway. If direct integrations are added later, keep their keys server-only and update this document, the Privacy Policy, and deployment docs.
