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

Do not submit the current remote-web test shell directly to App Store production. Apple requires apps to provide value beyond a repackaged website. Before store submission, add and verify native-only value such as share-sheet integration, resilient network/offline handling, push notifications where useful, native account/session affordances, and on-device QA.

Keep subscriptions and other digital purchases policy-compliant for the store build. Web Stripe checkout must not simply be assumed to be acceptable inside a store-distributed build.

## Free install path

The production website remains installable as a PWA from a supported browser without an App Store or Play Store developer account.
