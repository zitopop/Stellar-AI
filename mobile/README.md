# Stellar AI mobile

This folder is the native iOS/Android shell for Stellar AI.

## Current purpose

The web app remains the product source of truth. This Capacitor project creates a native test container for device QA, TestFlight, and Google Play testing while the native-only experience is developed.

The provisional application identifier is `com.trystellarai.stellar`. Do not publish a different identifier under the same store listing later; verify the final bundle/package ID before first store registration.

## Build

```bash
cd mobile
npm install
npm run add:ios
npm run add:android
npm run sync
```

Open the native projects with:

```bash
npm run open:ios
npm run open:android
```

iOS builds require macOS/Xcode. Android builds require Android Studio and the Android SDK.

## Release gate

The mobile shell now prepares a native share-sheet action for Stellar responses, keeps the existing offline fallback, and switches the remote workspace into a store-safe account mode when launched natively. In that mode customers can sign in and use access already attached to their Stellar account, while Stripe subscription purchase buttons and external plan-purchase calls to action are suppressed.

Do not treat this as automatic App Store approval. Apple still expects meaningful app-like value beyond a repackaged website, so public App Store submission should follow real-device QA and TestFlight testing. Google Play should also start with internal/closed testing before production.

For public store builds, keep digital-subscription billing aligned with the rules for each storefront. The normal website keeps its Stripe checkout; the native companion mode intentionally does not expose that web checkout.

## Free install path

The production website remains installable as a PWA from a supported browser without an App Store or Play Store developer account.


## Android Assist Mode

The Android build includes an optional user-controlled AccessibilityService bridge. It is intentionally limited to one explicit action per user command: read a sanitized visible-UI snapshot, tap matching visible text, type into a non-password field, scroll, Back, or Home.

Password fields are redacted and Android permission, installer, credential and system-UI surfaces are blocked. Screen details stay local unless the user explicitly chooses **Ask Stellar about this screen**. Enabling the service always requires the user to open Android Accessibility settings and switch Stellar AI on manually.

Do not describe this as autonomous background phone control. Keep the disclosure, affirmative consent and one-action-at-a-time approval model for Play review and user safety.
