# Stellar AI native store release gate

Last audited: **11 October 2026** — review checklist, **not** certification or approval.

## Current finding

The browser product at https://trystellarai.com is live and already offers free iPhone/Android installation as a PWA at https://trystellarai.com/install. The native project under `mobile/` is a Capacitor shell configured to load `https://trystellarai.com/app?source=native`; it is not yet demonstrated to meet Apple's requirement for usefulness beyond a repackaged website. The native project also has optional Android AccessibilityService code. These facts make **testing** appropriate now, but **public store submission** premature.

## Blockers — must pass before public submission

- [ ] **Legal identity:** enter the actual data controller/operator name and valid geographic business contact details on the public Privacy Policy, Terms/checkout where required, and store business disclosures. Never invent an identity/address.
- [ ] **Account deletion:** verify a real, discoverable account-deletion workflow in-app and on the web; confirm it deletes all eligible associated data across the account stores/providers. The new public request page and settings link initiate a support request, but do **not** prove deletion execution, required timelines or final store compliance.
- [ ] **Billing:** check the exact final native subscription flow against Apple 3.1.1 and Google Play Payments rules for digital features. Do not expose website Stripe checkout from native digital-feature paywalls. Confirm native access to existing entitlements is permitted for the specific business model and store region. Verify restore/manage/refund wording for any store-billed purchases.
- [ ] **Native utility:** add/test meaningful app-specific native UX beyond a simple web view; the Share action alone does not guarantee Apple guideline 4.2 approval.
- [ ] **Stability:** test login, signout, guest access, chat success/failure, free allowance, all available model/plan states, file attachments, network offline/reconnect, safe-area and keyboard on actual iPhone/iPad and Android devices.
- [ ] **Permissions:** audit camera, microphone, file, voice, notifications and analytics permissions, with concise just-in-time disclosures matching the feature behaviour.
- [ ] **Android Assist Mode:** keep AccessibilityService out of the first store build unless a policy/compliance review supports it; if included, validate in-app disclosure and consent, requested action boundaries, screenshot/data transmission, Play declaration, and account privacy disclosures.
- [ ] **Store setup:** accurate privacy/data safety questionnaires, content ratings, screenshots, icon, promotional claims, support URL and working demo reviewer account.
- [ ] **Payments QA:** confirm web Stripe subscriptions and account entitlements are correctly reflected, with no misleading in-app purchase claims.
- [ ] **Release review:** product owner signs off on legal text and actual data flows; a qualified UK legal adviser reviews applicable consumer, privacy and business disclosures before material paid distribution.

## Test sequence

1. Web/PWA regression: browser sign-in, AI chat, billing portal, legal routes and `/account-deletion` support path.
2. iOS device build + TestFlight testers: authenticate, interact, share, exercise plan state, test accessibility/VoiceOver and account settings.
3. Android internal testing: reproduce core flows on real Android devices; remove or fully validate AccessibilityService.
4. Android closed testing: for new personal Play developer accounts created after 13 November 2023, Google normally requires **at least 12 opted-in testers for 14 continuous days** before applying for production access. Verify current rules in Play Console.
5. Once all blockers are resolved, submit to both stores with review credentials and truthful privacy/payment declarations. Store review and availability are not guaranteed.

## Official policy links

- Apple: https://developer.apple.com/app-store/review/guidelines/
- Apple account deletion: https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion
- Google Play user data and deletion: https://support.google.com/googleplay/android-developer/answer/10144311
- Google personal account testing: https://support.google.com/googleplay/android-developer/answer/14151465

Current legal pages: `/terms`, `/privacy`, `/refunds`, `/legal`, `/account-deletion`.
