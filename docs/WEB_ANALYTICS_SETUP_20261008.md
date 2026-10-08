# Stellar AI Web Analytics tracking

The public HTML pages include /lib/assets/stellar-web-analytics.js, which loads the first-party Vercel Analytics script from /_vercel/insights/script.js. No third-party analytics accounts or cookies are required by this integration.

## Privacy and controls
- If localStorage stellar_metrics_optout = "1" or Global Privacy Control is enabled, tracking is skipped.
- If localStorage is unavailable, the loader fails closed.
- Query parameters and chat messages are not sent by this loader. Vercel's standard pageview script determines the viewed route.
- The existing cookie/local-storage notice gives users a product-metrics opt-out.

## How to verify
1. Enable Web Analytics for the stellar-ai Vercel project in its Analytics dashboard (if not enabled already). Vercel only adds its first-party analytics routes after deployment.
2. Deploy to production.
3. In a normal browser with optional metrics enabled, verify a GET request for /_vercel/insights/script.js and a POST request to the Vercel view endpoint.
4. Read data under Vercel > stellar-ai > Analytics. Tracking is prospective; historical visitors cannot be reconstructed.
5. Be aware browser ad blockers, GPC, the explicit opt-out and browser anti-bot checks can reduce recorded totals.

Instrumented HTML pages: 226
