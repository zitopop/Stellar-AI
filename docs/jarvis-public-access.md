# Public Jarvis access

- `/jarvis` is the conversational Jarvis surface for signed-in Stellar AI users.
- It uses the existing `/api/chat` route, so normal plan, usage and credit enforcement still applies.
- Users can type or use browser speech recognition; spoken replies use browser speech synthesis.
- The public page does not call the private Jarvis mission API.
- The existing private mission workspace is preserved at `/private-workspace.html` and continues to use the owner-gated `/api/desktop-agent?surface=jarvis` backend.
- Private PC control, business missions, owner calling and other privileged tools remain protected by their existing server-side authorization checks.

## Owner work orders

- The Work button on /jarvis is created only after a server-confirmed owner account check. The existing mission API separately verifies the signed-in owner; no client owner flag grants access.
- The owner explicitly starts a saved business research or drafting mission. Presets cover buyer research, paid-plan conversions, UK website offers, and product ideas. The revenue kind runs a growth specialist followed by a reviewer.
- Saved results and source references remain in /private-workspace.html. Optional completion messages go only to the verified owner inbox when correctly configured.
- No automatic customer outreach, live account changes, purchases, payments, unreviewed deployments or guaranteed earnings. Links to email, computer, and deployment workspaces retain their independent authorisation gates.
- The existing limit of eight new missions per UTC day, provider usage costs, idempotency, and daily background recovery are unchanged. This is not a continuous autonomous sales engine.
