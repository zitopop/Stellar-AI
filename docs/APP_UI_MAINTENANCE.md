# Stellar app UI maintenance

The production app is intentionally kept conservative after the September 2026 startup-lockup incident.

## Active UI assets

- `app.html` — authoritative application shell and existing chat/auth/billing logic.
- `stellar-orbit.css` — Stellar Orbit presentation.
- `stellar-orbit-extras.css` — Settings/control-centre presentation.
- `stellar-orbit.js` — safe Orbit enhancement runtime.
- `sw.js` — service worker; JavaScript requests are network-first so bad UI bundles do not remain pinned after a hotfix.

## Stability rules

1. Do not add DOM observers that watch attributes/text/classes that the same enhancement writes.
2. Do not add frequent whole-document mutation observers to `app.html`.
3. Prefer event-driven UI updates. If periodic sync is necessary, make it lightweight and idempotent.
4. Any optional enhancement must fail independently and must never block the core chat UI.
5. Keep auth, billing, credits, pricing, model entitlements and backend provider routing authoritative in the existing app/backend.
6. Before publishing UI changes, verify a real browser can load `/app`, focus/type into the prompt, open the model picker, open/close the sidebar and Settings, and remain responsive.
7. Keep JavaScript cache-busting/versioning explicit when a production hotfix changes runtime behavior.

## Retired files

The experimental `stellar-growth-v1.js` and `stellar-growth-v1.css` runtime was removed after it contributed to an unresponsive production app. Do not restore it wholesale. Reintroduce individual ideas only as small, tested Orbit features.
