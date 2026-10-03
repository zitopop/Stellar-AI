# Stellar iPhone Shortcut

This is the safe iPhone controller route for Stellar AI. It uses Apple's Shortcuts app as the phone-side launcher and the existing authenticated Stellar web app as the control surface.

## What it can do

- Open the Stellar command centre from the Home Screen, Siri, Action Button, Back Tap, or a widget.
- Let the signed-in owner use the existing Jarvis/owner controls, including call health and owner-call actions.
- Keep owner phone numbers, Twilio credentials, Retell credentials, and bridge tokens off the Shortcut and out of client-visible URLs.

## Recommended Shortcut

Name: `Stellar`

Actions:
1. `URL` → `https://trystellarai.com/app`
2. `Open URLs`

Optional iPhone triggers can be configured by the owner in iOS: Siri phrase "Stellar", Home Screen icon, widget, Action Button, or Back Tap.

## Security design

Do not put `TWILIO_AUTH_TOKEN`, `RETELL_API_KEY`, `CALL_BRIDGE_TOKEN`, owner phone number, or any bearer/session token in an Apple Shortcut. The existing `/api/broadcast` owner actions require the authenticated owner session. Internal urgent escalation remains server-to-server and requires `CALL_BRIDGE_TOKEN`.

The Shortcut deliberately does not attempt unrestricted iOS remote control. iOS actions remain constrained by Apple permissions and the actions exposed by Shortcuts/apps.

## Owner call flow

The existing Stellar app calls `/api/broadcast` with `action: callHealth` to check readiness and `action: callOwner` for an owner-requested call. Urgent server-side events can use `action: escalateOwner` with the protected bridge token. The phone Shortcut only opens the authenticated control surface; telephony secrets remain server-side.

## Twilio/Retell dependency

The Shortcut does not bypass telephony configuration. The customer-owned Twilio/Retell custom-telephony route still needs to be ready before a real owner call can succeed. Do not repeatedly place paid test calls while configuration is incomplete.