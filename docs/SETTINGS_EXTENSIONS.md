# Stellar Settings extensions

`stellar-settings-extensions.js` is the safe extension point for small user-facing Settings features.

## Why this exists

The core app remains in `app.html`. New Settings-only features should not require editing the large application shell or adding DOM observers that can trigger render loops.

## Rules

1. Keep Settings extensions presentation/preference only unless a separately reviewed backend change is explicitly approved.
2. Do not add `MutationObserver` loops, polling render loops, or repeated DOM rewrites.
3. Store device-only UI preferences under a dedicated `stellar-*` localStorage key.
4. Do not change auth, billing, credits, pricing, model entitlements, API keys, provider IDs, or checkout behavior here.
5. Keep every interactive control keyboard accessible and use real buttons.
6. The service worker keeps scripts/styles network-first so UI hotfixes are not pinned by stale caches.

## Register another Settings section

After `stellar-settings-extensions.js` loads, trusted first-party UI code can use:

```js
window.StellarSettingsExtensions.registerSection({
  id: 'my-feature',
  label: 'My feature',
  icon: '✦',
  build(panel) {
    const heading = document.createElement('div');
    heading.className = 'set-label';
    heading.textContent = 'My feature';
    panel.appendChild(heading);
  },
});
```

The extension host validates the section ID, prevents duplicate tabs/panels, inserts the tab before About, and delegates tab switching to the existing `setTab()` behavior.

## Built-in Preferences section

The first extension adds device-only options for:

- sidebar density: Comfortable / Compact
- code wrapping: Wrap / Scroll
- motion: Full / Reduced
- reset UI preferences

These are intentionally low-risk UI preferences and do not affect the user's plan, account, credits, or model access.
