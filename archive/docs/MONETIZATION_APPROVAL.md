# Stellar AI monetization change policy

This repository uses a **prepare, review, approve, then publish** workflow for monetization and public-promotion changes. Automated monitoring may research SEO opportunities and prepare a private recommendation, but it must not push changes to `main`.

## Safe preparation scope

A proposed change may be prepared locally for review when it is limited to content or presentation files such as `index.html`, `app.html`, blog content, and explicitly named SEO metadata. Preparation means generating a diff only. It does not mean creating a remote branch, commit, pull request, or push.

## Protected paths and actions

The following always require explicit owner approval immediately before any repository mutation: `api/`, payment and Stripe code, authentication and sessions, user credits and wallets, plan prices, checkout URLs, webhook behavior, secrets, database/storage code, public advertising, email or social posts, and any change that alters a customer’s offer or charge.

## Required review record

Before publication, the owner must review the exact file list and diff. The approval record must name the files and the intended effect. If the file list changes, approval is required again. Any failed tests, unexpected file, secret, or protected path stops the workflow.

## Current monetization change set

The current local change set corrects top-up display math, shares the bonus schedule between checkout and webhook, makes payment return URLs explicit, exposes monthly/annual state, and clarifies buyer guidance. It is intentionally unpushed until the owner approves this exact file list:

```text
api/_pricing.js
api/_pricing.test.mjs
api/create-checkout.js
api/get-plan.js
api/webhook.js
app.html
index.html
MONETIZATION_APPROVAL.md
```

The repository contains no automatic publisher for this workflow. A human approval is required before any of these files are committed or pushed to `main`.
