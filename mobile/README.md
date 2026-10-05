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
npm run prepare:android-control
```

Open the native projects with:

```bash
npm run open:ios
npm run open:android
```

iOS builds require macOS/Xcode. Android builds require Android Studio and the Android SDK.

## Release gate

The mobile shell prepares a native share-sheet action for Stellar responses, keeps the existing offline fallback, and switches the remote workspace into a store-safe account mode when launched natively. In that mode customers can sign in and use access already attached to their Stellar account, while Stripe subscription purchase buttons and external plan-purchase calls to action are suppressed.

Do not treat this as automatic App Store approval. Apple still expects meaningful app-like value beyond a repackaged website, so public App Store submission should follow real-device QA and TestFlight testing. Google Play should also start with internal/closed testing before production.

For public store builds, keep digital-subscription billing aligned with the rules for each storefront. The normal website keeps its Stripe checkout; the native companion mode intentionally does not expose that web checkout.

## Free install path

The production website remains installable as a PWA from a supported browser without an App Store or Play Store developer account.

## Android Phone Assist Mode

The Android native build includes a user-controlled **Phone Assist Mode**. It uses Android Accessibility only after the user explicitly enables the service in system settings.

Design rules:
- no hidden or background autonomous action planning;
- no action runs merely because an AI response suggested it;
- every tap, type, scroll, Back or Home action is explicitly triggered by the user in Stellar;
- password fields are excluded from screen summaries and editable contents are redacted;
- screen structure stays on-device unless the user explicitly adds the current screen summary to Stellar chat;
- the user can disable the service from Stellar or Android settings at any time.

This is not declared as an Android accessibility tool for disability support. A Google Play build using this feature must complete the AccessibilityService declaration and prominent-disclosure requirements, and the store listing must accurately describe the feature.
