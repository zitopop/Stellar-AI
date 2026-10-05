# Stellar Android Phone Assist Mode

This directory contains native Android source copied into the generated Capacitor project by `npm run prepare:android-control`.

## Safety contract

Phone Assist is intentionally **user-driven**, not an autonomous phone operator:

- the user must explicitly enable the Android Accessibility service;
- no background accessibility events are streamed to Stellar or an AI model;
- screen summaries redact passwords and editable-field contents;
- screen summaries are sent to Stellar chat only after the user explicitly chooses to add them;
- tap actions require exact visible text chosen by the user;
- text entry is limited to the currently focused, non-password editable field;
- scrolling and Back/Home are individual user-triggered commands;
- the user can disable the service from Stellar.

Do not extend the Google Play build into arbitrary AI-planned action execution. Keep Play Console disclosures and the in-app consent copy aligned with actual behavior.
