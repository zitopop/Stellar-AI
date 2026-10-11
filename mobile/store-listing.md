# Stellar AI — proposed mobile store listing (11 October 2026)

**Not approved for submission yet.** Match every statement against the tested native build before using it in App Store Connect or Play Console.

## Identity

- **App name:** Stellar AI
- **Proposed iOS bundle / Android package ID:** `com.trystellarai.stellar` (confirm before first public submission)
- **Website:** https://trystellarai.com
- **Support:** https://trystellarai.com/support
- **Privacy:** https://trystellarai.com/privacy
- **Account deletion request:** https://trystellarai.com/account-deletion
- **Audience:** people who want help thinking, writing, planning, understanding files and fixing code. FiveM/Roblox coding remains a specialist use case, not the main positioning.

## Apple App Store draft

- **Subtitle:** AI for Work, Ideas & Code
- **Primary category:** Productivity
- **Keywords:** AI,assistant,writing,planning,code,debug,ideas,notes,files

### Description

Stellar AI helps you turn questions into useful next steps.

Ask a question, draft an email, organize a project plan or get help understanding a coding problem — all from one streamlined AI workspace.

With Stellar AI you can:
- get explanations, suggestions and structured drafts;
- write, edit and refine messages, notes and plans;
- troubleshoot code and understand error messages;
- work with supported documents and files;
- switch between available Stellar AI model levels based on your plan;
- use the same Stellar account across supported devices.

Developers can also get help with FiveM Lua, QBCore, ESX and Roblox Luau.

Start with the Free allowance. More model access and capacity may be available to accounts with an eligible plan. Features vary by platform and setup.

AI-generated content can be inaccurate. Review important answers and test generated code before relying on it.

## Google Play draft

- **Category:** Productivity
- **Short description:** Ask, write, plan and solve coding problems with Stellar AI.
- **Full description:** Adapt the Apple description to Play Console requirements after validating the submitted Android build.

## App review notes — verify rather than copy blindly

- Current native shell loads the live account workspace and includes a native Share action and offline fallback; do not claim robust offline chat.
- Native companion mode is intended to hide web Stripe digital-subscription purchase buttons. Validate the actual build on devices and confirm that the final payment/entitlement model satisfies the app store policy.
- Provide a reviewer account that demonstrates working chat, account settings and permitted paid features without exposing owner-only tools.
- In-app settings now link to a deletion **request** page; this is not a complete automatic account-erasure flow and requires review against Apple/Google requirements.
- Do not enable Android Assist Mode in the first public build unless the AccessibilityService and its disclosures have passed dedicated technical and policy review.
- The website PWA install is separate from store distribution.

## Store questionnaires requiring owner verification

- Business/operator name, legal contact and postal/geographic business details;
- accurate data collection, processing, retention, and deletion disclosures;
- Apple privacy nutrition labels and Google Data safety responses;
- Android Accessibility declaration, if applicable;
- age/content ratings;
- login/account deletion test steps;
- payment model, subscriptions and any native in-app purchase configuration;
- encryption/export compliance;
- camera, microphone, uploads, voice and screen/Accessibility permission descriptions;
- trademark/logo rights, assets, screenshots and supported-device testing.

**Do not submit until [STORE-READINESS.md](STORE-READINESS.md) has been reviewed.**
