(() => {
  'use strict';
  // Emergency stability mode: the optional Stellar Growth runtime is disabled.
  // Core chat, auth, billing, model selection, Stellar Orbit UI, blogs and SEO
  // continue to run from the existing app. This file intentionally performs no
  // DOM observation, polling, overlays, project drawers, or interaction hooks.
  window.__stellarGrowthV1DisabledForStability = true;
})();
