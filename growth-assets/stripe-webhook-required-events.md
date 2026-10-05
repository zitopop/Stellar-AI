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

## Production status

Verified on 5 October 2026: the live Stripe endpoint at `https://trystellarai.com/api/webhook` is enabled with the full event list above, including asynchronous Checkout success/failure and subscription lifecycle events.

Stellar Checkout therefore uses Stripe dynamic payment methods instead of forcing `payment_method_types: ['card']`. Eligible wallets and fast-pay methods can be surfaced by Stripe based on the customer, device, currency and account configuration. Phone collection remains disabled for the self-serve plan checkout.

Business-service onboarding fields are collected after payment by the existing secure fulfilment flow, reducing pre-payment form friction while preserving fulfilment validation.
