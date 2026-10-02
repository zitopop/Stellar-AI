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

Until the live Stripe connection has permission to add the asynchronous Checkout events above, Stellar Checkout is intentionally restricted to card payments. This prevents an asynchronous payment from succeeding at Stripe without the corresponding entitlement event reaching Stellar.

Once the production webhook endpoint is confirmed to receive the async payment events, remove the temporary `payment_method_types: ['card']` guards from `api/create-checkout.js` and let Stripe dynamically choose eligible payment methods.

Do not enable a broader payment-method set before the webhook subscription is verified.
