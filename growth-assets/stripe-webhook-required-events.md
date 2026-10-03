# Stripe billing webhook requirements

Stellar AI's billing handler is prepared for the full subscription and asynchronous Checkout lifecycle.

## Production endpoint

`https://trystellarai.com/api/webhook`

The Stripe webhook endpoint should deliver:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
- `payout.failed`
- `charge.refunded`
- `charge.dispute.created`
- `radar.early_fraud_warning.created`

## Current safety guard

As verified on 2 October 2026, the live Stripe endpoint at `https://trystellarai.com/api/webhook` is enabled but is not yet subscribed to every event in the list above. In particular, asynchronous Checkout success/failure and some subscription lifecycle events are still missing from the live endpoint configuration.

Until those live endpoint subscriptions are complete, Stellar Checkout deliberately restricts sessions to `payment_method_types: ['card']` with `phone_number_collection.enabled = false`. Standard card Checkout remains available, including eligible card wallets when Stripe surfaces them. Stripe Link is intentionally disabled so checkout does not present the saved-contact fast-pay path. This guard also avoids enabling delayed payment methods whose later success/failure events may not reach Stellar.

After the live endpoint is subscribed to the full event list and delivery is verified, remove this temporary allowlist and return to Stripe dynamic payment methods.
