# Stellar AI mobile release checklist

## I can automate
- [x] Capacitor iOS/Android shell exists.
- [x] Native mode suppresses web subscription checkout.
- [x] Native Share action is wired.
- [x] PWA/offline fallback exists.
- [x] Store listing copy drafted.
- [x] GitHub workflow can produce Android QA APK, Android release AAB and an iOS simulator build.
- [ ] Real-device Android QA.
- [ ] Real-device iPhone QA.
- [ ] Signed Android release with permanent upload key.
- [ ] Signed iOS archive with Apple distribution signing.
- [ ] Upload to Play Console testing.
- [ ] Upload to TestFlight.
- [ ] Store screenshots captured from final native build.

## You must personally approve
- Google account sign-in and developer identity verification.
- Google Play developer fee payment.
- Android-device verification if Google asks for it.
- Apple Account sign-in, two-factor authentication and identity verification.
- Apple Developer Program fee payment.
- Legal agreements, tax/banking details and any trader verification.
- Any payment card or government-ID step.

## Recommended release order
1. Create/verify Google Play developer account.
2. Run the GitHub **Mobile Store Build** workflow.
3. Upload the signed AAB to Internal Testing.
4. Move to Closed Testing and meet any tester requirement shown by your account.
5. Enrol in Apple Developer Program.
6. Generate/sign the iOS project on a Mac/Xcode environment.
7. Upload to TestFlight and test on a real iPhone.
8. Fix any device-specific issues.
9. Submit both public store listings.
