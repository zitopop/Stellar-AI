# Stellar Jarvis Command System

Jarvis is an owner-authorized command layer, not unrestricted remote administration.

## Live flow

1. Tobi speaks to Jarvis.
2. Voice/reasoning resolves the requested action.
3. Safe commands are submitted to `/api/jarvis-command`.
4. The command gateway classifies the request before queueing it.
5. A connected, authorized worker such as T10 claims the task and reports a result.
6. Jarvis reads the verified result and reports it back in the conversation.

## Safe automatic actions

`health`, `stellar-status`, `git-status`, `run-tests`, `deployment-status`, and `inbox-summary` may be queued automatically when requested by the authenticated owner.

## Approval boundary

Spending, purchases, destructive deletion, credentials/security changes, KYC/identity work and contractual commitments are never silently executed. Unknown commands are denied rather than converted into shell commands.

## PC worker contract

The PC worker must authenticate independently, poll/claim queued tasks, map each action to a fixed allowlisted implementation, and return structured status/output. It must never evaluate arbitrary shell text received from a call. Secrets stay on the server/worker and are never spoken on calls.

## Realtime UX

Surface states such as `listening`, `thinking`, `queued`, `running`, `waiting-for-approval`, `completed`, and `failed`. Only say a task is completed after the worker has returned a successful result.

## Calling

Owner calls continue through the existing Twilio/Retell path. A call provider being configured is separate from PC worker readiness; the UI and Jarvis must report those states independently.
