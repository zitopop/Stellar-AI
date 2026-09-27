// Stellar AI service worker — offline shell, safe static caching, app-load patching, and update signalling.
const SW_VERSION = 'stellar-sw-2026-09-27-simple-workspace-v12';
const SHELL_CACHE = `stellar-shell-${SW_VERSION}`;
const STATIC_CACHE = `stellar-static-${SW_VERSION}`;
const OFFLINE_URL = '/offline.html';
const PRECACHE = [
  OFFLINE_URL,
  '/manifest.json',
  '/lib/assets/pwa/icon-192.png',
  '/lib/assets/pwa/icon-512.png',
  '/stellar-capabilities-guide.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await cache.addAll(PRECACHE);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL_CACHE, STATIC_CACHE]);
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('stellar-') && !keep.has(key)).map((key) => caches.delete(key)));
    await self.clients.claim();
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) client.postMessage({ type: 'STELLAR_SW_UPDATED', version: SW_VERSION });
  })());
});

function capabilityGuideLoader() {
  return `\n;(() => {\n  if (window.__stellarCapabilitiesGuideLoaderV7) return;\n  window.__stellarCapabilitiesGuideLoaderV7 = true;\n  try {\n    const script = document.createElement('script');\n    script.src = '/stellar-capabilities-guide.js?v=7';\n    script.defer = true;\n    script.setAttribute('data-stellar-capabilities-guide-loader', 'true');\n    document.head.appendChild(script);\n  } catch (_) {}\n})();\n`;
}

function googleIdentityLazyLoader() {
  return `<script id="stellar-google-identity-lazy-loader-v1">
(() => {
  if (window.StellarGoogleIdentity?.load) return;
  let promise = null;
  function loadGoogleIdentity() {
    if (window.google?.accounts?.id) return Promise.resolve(window.google);
    if (promise) return promise;
    promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google);
      script.onerror = () => reject(new Error('google_identity_load_failed'));
      document.head.appendChild(script);
    });
    return promise;
  }
  window.StellarGoogleIdentity = { load: loadGoogleIdentity };
  const authSelector = '[data-auth],[data-google],#google-signin,#googleSignIn,#login-btn,#signup-btn,#loginBtn,#signupBtn,.google-login,.google-signin';
  document.addEventListener('pointerdown', (event) => {
    if (event.target?.closest?.(authSelector)) loadGoogleIdentity().catch(() => {});
  }, { capture: true, passive: true });
  document.addEventListener('focusin', (event) => {
    if (event.target?.closest?.(authSelector)) loadGoogleIdentity().catch(() => {});
  }, { capture: true });
})();
</script>`;
}

function simpleWorkspaceLayer() {
  return `<script id="stellar-simple-workspace-v1">
(() => {
  if (window.__stellarSimpleWorkspaceV1) return;
  window.__stellarSimpleWorkspaceV1 = true;

  const KEEP_WORDS = [
    'chat', 'new chat', 'continue', 'plans', 'plan', 'credits', 'credit',
    'settings', 'account', 'support', 'help', 'billing', 'legal', 'terms'
  ];
  const BUSY_WORDS = [
    'investor', 'operator', 'deploy', 'seo', 'blog', 'business', 'website audit',
    'ai receptionist', 'email agent', 'growth', 'admin', 'owner', 'debug', 'guide',
    'prompt', 'five m', 'fivem', 'roblox', 'shopify', 'broadcast', 'status center',
    'toolkit', 'playbook', 'launch center', 'strategy', 'services'
  ];

  function textFor(el) {
    return [
      el.textContent,
      el.getAttribute?.('href'),
      el.getAttribute?.('aria-label'),
      el.getAttribute?.('title'),
      el.id,
      el.className
    ].filter(Boolean).join(' ').toLowerCase();
  }

  function shouldHide(el) {
    const text = textFor(el);
    if (!text) return false;
    const looksBusy = BUSY_WORDS.some((word) => text.includes(word));
    const looksCore = KEEP_WORDS.some((word) => text.includes(word));
    return looksBusy && !looksCore;
  }

  function simplifyWorkspace() {
    document.body?.classList?.add('stellar-simple-workspace');

    document.querySelectorAll('.side a,.side button,.top a,.top button,.nav-link,.set-item').forEach((el) => {
      if (!shouldHide(el)) return;
      el.dataset.stellarSimpleHidden = 'true';
      el.hidden = true;
      el.setAttribute('aria-hidden', 'true');
      el.setAttribute('tabindex', '-1');
    });

    document.querySelectorAll('.side-section').forEach((section) => {
      const title = section.querySelector('.side-title')?.textContent || '';
      const links = Array.from(section.querySelectorAll('a,button'));
      const visibleLinks = links.filter((link) => !link.hidden && getComputedStyle(link).display !== 'none');
      if (/tools|pages|growth|seo|business|more|owner|admin/i.test(title) && visibleLinks.length === 0) {
        section.hidden = true;
        section.dataset.stellarSimpleHidden = 'true';
      }
    });

    const welcomeCopy = document.querySelector('.welcome p,.home-welcome p,.space-home-subtitle');
    if (welcomeCopy && !welcomeCopy.dataset.stellarSimpleCopy) {
      welcomeCopy.dataset.stellarSimpleCopy = 'true';
      welcomeCopy.textContent = 'Ask Stellar anything. Plans, credits, settings and support are tucked away so the workspace stays clean.';
    }
  }

  function installStyle() {
    if (document.getElementById('stellar-simple-workspace-style-v1')) return;
    const style = document.createElement('style');
    style.id = 'stellar-simple-workspace-style-v1';
    style.textContent = `
      body.stellar-simple-workspace .quick,
      body.stellar-simple-workspace .quality-strip,
      body.stellar-simple-workspace .plan-quality,
      body.stellar-simple-workspace .owner-only:not(.signed-in-only),
      body.stellar-simple-workspace [data-stellar-simple-hidden="true"]{display:none!important;}
      body.stellar-simple-workspace .side{gap:8px!important;}
      body.stellar-simple-workspace .side-section{padding-top:8px!important;}
      body.stellar-simple-workspace .side-title{margin-bottom:6px!important;color:#8f96a5!important;letter-spacing:.08em!important;}
      body.stellar-simple-workspace .chat-actions{grid-template-columns:1fr!important;}
      body.stellar-simple-workspace .welcome{padding-top:clamp(38px,9vh,92px)!important;}
      body.stellar-simple-workspace .welcome h1,
      body.stellar-simple-workspace .home-welcome h1{font-size:clamp(40px,7vw,72px)!important;max-width:850px!important;margin-inline:auto!important;}
      body.stellar-simple-workspace .composer-wrap{z-index:40!important;}
      @media(max-width:780px){
        body.stellar-simple-workspace .top-actions .btn:not(.primary):not([id*="setting" i]):not([id*="account" i]){display:none!important;}
        body.stellar-simple-workspace .top-usage{max-width:140px!important;}
        body.stellar-simple-workspace .side{width:min(82vw,300px)!important;}
      }
    `;
    document.head.appendChild(style);
  }

  function run() {
    installStyle();
    simplifyWorkspace();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
  window.addEventListener('pageshow', run);
  setTimeout(run, 500);
  setTimeout(run, 1800);
})();
</script>`;
}

async function patchAppNavigationResponse(request, response) {
  const url = new URL(request.url);
  if (!/\/app(?:\.html)?$/i.test(url.pathname)) return response;
  if (!response?.ok || response.type !== 'basic') return response;
  const type = response.headers.get('Content-Type') || '';
  if (!type.toLowerCase().includes('text/html')) return response;

  let html = await response.text();
  const eagerGoogle = '<script src="https://accounts.google.com/gsi/client" async defer></script>';
  if (html.includes(eagerGoogle)) html = html.replace(eagerGoogle, googleIdentityLazyLoader());
  if (!html.includes('stellar-simple-workspace-v1')) html = html.replace('</head>', `${simpleWorkspaceLayer()}\n</head>`);

  const headers = new Headers(response.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, { cache: 'no-store' });
        return await patchAppNavigationResponse(request, response);
      } catch {
        return (await caches.match(OFFLINE_URL)) || new Response('Stellar AI is offline. Please try again when you reconnect.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
    })());
    return;
  }

  const destination = request.destination;
  if (!['style', 'script', 'image', 'font', 'manifest'].includes(destination)) return;

  // UI code and styles use stale-while-revalidate. Versioned assets render
  // immediately from cache on repeat visits while a fresh copy is fetched in
  // the background. This avoids slow button/UI startup on mobile connections.
  if (destination === 'script' || destination === 'style') {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(request);
      const refresh = (async () => {
        try {
          const response = await fetch(request, { cache: 'no-cache' });
          if (!response.ok || response.type !== 'basic') return null;
          const shouldAttachGuide = destination === 'script' && ['/currency.js', '/stellar-settings-extensions.js'].includes(url.pathname);
          if (shouldAttachGuide) {
            const source = await response.clone().text();
            const body = source.includes('__stellarCapabilitiesGuideLoaderV7') ? source : source + capabilityGuideLoader();
            const patched = new Response(body, {
              status: response.status,
              statusText: response.statusText,
              headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-cache' },
            });
            await cache.put(request, patched.clone());
            return patched;
          }
          await cache.put(request, response.clone());
          return response;
        } catch {
          return null;
        }
      })();
      if (cached) {
        event.waitUntil(refresh);
        return cached;
      }
      return (await refresh) || Response.error();
    })());
    return;
  }

  // Images, fonts and the manifest are stable assets, so cache-first is appropriate.
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') {
        const cache = await caches.open(STATIC_CACHE);
        await cache.put(request, response.clone());
      }
      return response;
    } catch {
      return cached || Response.error();
    }
  })());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data?.json?.() || {}; } catch {
    payload = { body: event.data?.text?.() || '' };
  }
  const title = String(payload.title || 'Jarvis is calling');
  const body = String(payload.body || payload.summary || 'Stellar AI needs your attention.');
  const callId = String(payload.callId || payload.id || '');
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: '/lib/assets/pwa/icon-192.png',
    badge: '/lib/assets/pwa/icon-192.png',
    tag: callId ? 'stellar-call-' + callId : 'stellar-call',
    renotify: true,
    data: { url: '/app?stellarCall=1', callId },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = String(event.notification?.data?.url || '/app?stellarCall=1');
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((client) => {
      try { return new URL(client.url).origin === self.location.origin; } catch { return false; }
    });
    if (existing) {
      await existing.focus();
      existing.postMessage({ type: 'STELLAR_CALL_OPEN', callId: event.notification?.data?.callId || '' });
      return;
    }
    await self.clients.openWindow(target);
  })());
});
