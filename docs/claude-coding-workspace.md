# Customer coding workspace

The PC Agent page uses the existing server-side Anthropic connection for every signed-in customer's paired Windows workspace. Customers do not receive the provider key or access the owner's computer. This is a Claude-powered Stellar feature, not the OpenAI Codex product.

The customer pairs the companion, describes a task, runs inspection actions, reviews proposed edits and test commands, and selects the actions to execute. Execution results are returned to Claude for a review and optional next batch. Edits and terminal commands in every new batch start unchecked. There is no unattended approval loop.

The follow-up planner uses `/api/desktop-agent?action=plan`, the same deployed route as initial planning. Precise `apply_patch` actions require account write permission and explicit approval, reject secret paths/content, and use the companion's unique-match replacement and backup behavior. Initial inspection plans are restricted to read-only actions by server validation.

Planner calls retain the existing 12-per-hour account limit. A model response is not proof that code ran: completed and failed tool results, plus skipped-action warnings, are supplied for review. The interface prevents concurrent runs and discards consumed plans to avoid accidental replay after a review failure.

## Limits

- Requires each customer's paired Windows companion to be online. This release does not add hosted sandboxes or GitHub account connections.
- Shell execution requires both account permission and the companion's local shell opt-in. It executes on the customer's machine; path checks are not an operating-system sandbox.
- The current run and model context live in the page; reloading does not resume the coding conversation. The existing task history and audit trail remain server-side.
- Provider usage uses Stellar's existing Anthropic account. No new key is required.
- No live customer files or paid model requests were used during automated verification.

Validation: full repository test suite; executable tests for patch permission/approval, secret-path rejection, inspection escalation prevention, and review approval preservation. Live customer end-to-end execution still requires a paired test device.
