# Stellar AI account deletion — operations and completion gate

**As of 11 October 2026:** request intake exists, but account/data erasure is **not automated**. Do not represent the application as having completed account deletion simply because a request was accepted.

## Request intake

- Signed-in users: Settings → Delete account → confirmation → `POST /api/auth` with `action=requestAccountDeletion`.
- The server verifies a signed session and records an idempotent request at `stellar:account-deletion:request:<account-email>` in configured Upstash KV.
- The server indexes the request in `stellar:account-deletion:queue`. A failed queue write returns a retryable error while preserving the durable request; the next request retries indexing without duplicating a queued address. If Resend is configured, it attempts to notify the current support address. Email alerts are **not** guaranteed, so the operator must check the queue regularly.
- Only a signed-in private operator can list requests through `POST /api/auth`, `action=listDeletionRequests`, with a valid Bearer session.
- Users who no longer have app access can request account deletion externally at `/account-deletion`, with identity verification when necessary.

## Fulfillment steps (manual until a verified backend exists)

1. Confirm the request belongs to the account holder, and acknowledge receipt without collecting passwords or payment cards.
2. Find the account's canonical email and any historical sign-in aliases; identify Google/Discord/password account records.
3. Check whether the account has Stripe-billed subscriptions or store-billed subscriptions. Do not claim that account deletion alone cancels external billing. Make sure the user understands the correct cancellation method and exercise any rights requiring cancellation or refunds.
4. Enumerate stored account data across KV profile/auth records, signed-in chats, usage and billing references, referral records, API keys, plugin credentials and tokens, paired StellarX devices, Jarvis/task records, and any business-service/receptionist data; also identify uploads, third-party processors, backups and operational logs.
5. Revoke account login and active sessions **before** data removal. **Critical blocker:** current auth tokens are HMAC-signed, valid for up to 30 days and not checked against a server-side revocation list on every request. Deleting only the profile/auth record is **not sufficient** to revoke an already-issued token. A proper account revocation or session-version gate is required.
6. Remove eligible personal data and connected-provider data using the appropriate verified services. Retain only legally required records with their lawful basis, retention purpose and deletion deadline recorded.
7. Verify that existing tokens cannot access or recreate removed data, that account login is blocked, and that associated records are no longer available. Re-test from a clean browser/device.
8. Update the request status to completed **only after** verification (there is intentionally no public or automatic completion button), and notify the requester of completion and any lawful exceptions.
9. Record minimal proof of compliance, handling location and completion date, without retaining deleted content.

## Pre-store release blocker

Apple and Google expect account deletion to remove eligible associated data. An in-app request button and a mailbox are not enough without a reliable fulfillment process. Before public store submission, implement/test revocation, provider data erasure, support acknowledgment and completion notification, plus legal review of actual data flows.

## Related policy pages

- `/terms`
- `/privacy`
- `/refunds`
- `/account-deletion`
