// Stellar AI service worker — clean landing cache, Google sign-in UI patch, offline support and push notifications.
const SW_VERSION = 'stellar-sw-2026-09-29-clean-landing-google-v1';
const SHELL_CACHE = `stellar-shell-${SW_VERSION}`;
const STATIC_CACHE = `stellar-static-${SW_VERSION}`;
const OFFLINE_URL = '/offline.html';
const PRECACHE = [
  OFFLINE_URL,
  '/manifest.json',
  '/lib/assets/pwa/icon-192.png',
  '/lib/assets/pwa/icon-512.png',
  '/lib/assets/homepage.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await cache.addAll(PRECACHE).catch(() => {});
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

function googleSignInPatch() {
  return `<script id="stellar-google-signin-ui-v1">
(() => {
  if (window.__stellarGoogleSigninUIV1) return;
  window.__stellarGoogleSigninUIV1 = true;
  const CLIENT_ID = '308347075858-9eu0dootm325qgq7hba7qsnnchmcke1r.apps.googleusercontent.com';
  let googleLoadPromise = null;

  function loadGoogle() {
    if (window.google?.accounts?.id) return Promise.resolve(window.google);
    if (googleLoadPromise) return googleLoadPromise;
    googleLoadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.google), { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google);
      script.onerror = () => reject(new Error('Google sign-in could not load.'));
      document.head.appendChild(script);
    });
    return googleLoadPromise;
  }

  function setStatus(message, type = 'good') {
    const status = document.getElementById('status');
    if (status) {
      status.textContent = message;
      status.className = 'status ' + type;
    }
  }

  function getReferralCode() {
    try {
      const q = new URLSearchParams(location.search);
      return q.get('ref') || q.get('referral') || localStorage.getItem('stellar-referral-code') || '';
    } catch { return ''; }
  }

  function setSession(session, user) {
    try {
      const current = JSON.parse(localStorage.getItem('stellar-store') || '{}') || {};
      localStorage.setItem('stellar-store', JSON.stringify({ ...current, session, user, owner: false }));
    } catch {
      localStorage.setItem('stellar-store', JSON.stringify({ session, user, owner: false }));
    }
  }

  async function handleGoogleCredential(response) {
    const credential = response?.credential;
    if (!credential) {
      setStatus('Google sign-in was cancelled.', 'warn');
      return;
    }
    setStatus('Signing in with Google…', 'warn');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'googleLogin', credential, referralCode: getReferralCode() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.session) throw new Error(data.error || 'Google sign-in failed.');
      setSession(data.session, data.user || {});
      setStatus('Signed in with Google.', 'good');
      setTimeout(() => location.reload(), 450);
    } catch (error) {
      setStatus(error?.message || 'Google sign-in failed.', 'error');
    }
  }

  function injectStyles() {
    if (document.getElementById('stellar-google-signin-style-v1')) return;
    const style = document.createElement('style');
    style.id = 'stellar-google-signin-style-v1';
    style.textContent = `
      .stellar-google-box{display:grid;gap:10px;margin:0 0 12px;padding:13px;border:1px solid rgba(255,255,255,.085);border-radius:16px;background:rgba(255,255,255,.028)}
      .stellar-google-box strong{font-size:13px;color:#f6f7fb}.stellar-google-box small{display:block;color:#8f98a7;line-height:1.4}.stellar-google-render{min-height:42px;display:flex;align-items:center}.stellar-google-fallback{min-height:42px;border:1px solid rgba(255,255,255,.11);border-radius:999px;background:#fff;color:#111;font-weight:850;display:flex;align-items:center;justify-content:center;width:100%}
    `;
    document.head.appendChild(style);
  }

  function addGoogleButton() {
    const emailField = document.getElementById('authEmail');
    if (!emailField || document.getElementById('stellar-google-signin-box')) return;
    const card = emailField.closest('.card') || emailField.closest('section') || emailField.parentElement;
    if (!card) return;
    injectStyles();
    const box = document.createElement('div');
    box.id = 'stellar-google-signin-box';
    box.className = 'stellar-google-box';
    box.innerHTML = '<div><strong>Sign in faster</strong><small>Use Google, or use email below.</small></div><div class="stellar-google-render" id="stellar-google-render"></div><button class="stellar-google-fallback" type="button" id="stellar-google-fallback">Continue with Google</button>';
    card.insertBefore(box, card.firstChild);
    const fallback = box.querySelector('#stellar-google-fallback');
    const renderTarget = box.querySelector('#stellar-google-render');
    loadGoogle().then((google) => {
      google.accounts.id.initialize({ client_id: CLIENT_ID, callback: handleGoogleCredential, auto_select: false, cancel_on_tap_outside: true });
      if (renderTarget) {
        google.accounts.id.renderButton(renderTarget, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', width: Math.min(360, Math.max(240, box.clientWidth - 28)) });
      }
      fallback?.addEventListener('click', () => google.accounts.id.prompt(), { passive: true });
    }).catch(() => {
      fallback.textContent = 'Google sign-in could not load';
      fallback.disabled = true;
    });
  }

  function run() { addGoogleButton(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
  new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true });
  window.StellarGoogleSignInPatch = { run };
})();
</script>`;
}

function simpleWorkspaceLayer() {
  return `<script id="stellar-simple-workspace-v2">
(() => {
  if (window.__stellarSimpleWorkspaceV2) return;
  window.__stellarSimpleWorkspaceV2 = true;
  function installStyle(){
    if(document.getElementById('stellar-simple-workspace-style-v2'))return;
    const style=document.createElement('style');
    style.id='stellar-simple-workspace-style-v2';
    style.textContent=[
      'body.stellar-simple-workspace .quick,body.stellar-simple-workspace .quality-strip,body.stellar-simple-workspace .plan-quality{display:none!important}',
      'body.stellar-simple-workspace .side{gap:8px!important}',
      'body.stellar-simple-workspace .welcome{padding-top:clamp(38px,9vh,92px)!important}',
      'body.stellar-simple-workspace .welcome h1{font-size:clamp(36px,7vw,60px)!important;letter-spacing:-.055em!important}',
      'body.stellar-simple-workspace .account-title strong,body.stellar-simple-workspace .account-title small{white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}',
      '@media(max-width:540px){body.stellar-simple-workspace .panel{max-height:91dvh!important;border-radius:24px 24px 0 0!important}body.stellar-simple-workspace .top-brand{display:none!important}}'
    ].join('\n');
    document.head.appendChild(style);
  }
  function niceNameFromEmail(email){const raw=String(email||'').trim().toLowerCase();if(raw==='deadlyfox10@gmail.com')return'Tobi';if(!raw.includes('@'))return'';const local=raw.split('@')[0].replace(/[._-]+/g,' ').replace(/\d+/g,' ').trim();return local?local.split(/\s+/).map(p=>p?p[0].toUpperCase()+p.slice(1):'').join(' ').slice(0,38):''}
  function polishSettings(){const card=document.querySelector('.account-card');if(!card)return;const name=card.querySelector('.account-title strong');const email=card.querySelector('.account-title small');const fixed=niceNameFromEmail(email?.textContent);if(name&&fixed&&/^(account|owner|user|signed in)$/i.test(name.textContent.trim()))name.textContent=fixed;if(email)email.title=email.textContent.trim()}
  function run(){document.body?.classList?.add('stellar-simple-workspace');installStyle();polishSettings()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});
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
  const injection = `${simpleWorkspaceLayer()}\n${googleSignInPatch()}`;
  if (!html.includes('stellar-simple-workspace-v2')) html = html.replace('</head>', `${simpleWorkspaceLayer()}\n</head>`);
  if (!html.includes('stellar-google-signin-ui-v1')) html = html.replace('</body>', `${googleSignInPatch()}\n</body>`);
  const headers = new Headers(response.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}

async function patchHomeNavigationResponse(request, response) {
  const url = new URL(request.url);
  if (!/^\/(?:index\.html)?$/i.test(url.pathname)) return response;
  if (!response?.ok || response.type !== 'basic') return response;
  const type = response.headers.get('Content-Type') || '';
  if (!type.toLowerCase().includes('text/html')) return response;
  let html = await response.text();
  html = html.replace(/500 welcome Stellar Credits/gi, 'Free daily credits');
  html = html.replace(/Ask anything\.<br>Get real work done\./i, 'A clean AI workspace.<br>For real work.');
  if (!html.includes('/lib/assets/homepage.js')) {
    html = html.replace('</body>', '<script src="/lib/assets/homepage.js?v=20260929-clean" defer></script>\n</body>');
  }
  const headers = new Headers(response.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, { cache: 'no-store' });
        const appPatched = await patchAppNavigationResponse(request, response);
        return await patchHomeNavigationResponse(request, appPatched);
      } catch {
        return (await caches.match(OFFLINE_URL)) || new Response('Stellar AI is offline. Please try again when you reconnect.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    })());
    return;
  }

  if (!['style', 'script', 'image', 'font', 'manifest'].includes(request.destination)) return;
  event.respondWith((async () => {
    const cached = await caches.match(request);
    const fetchFresh = async () => {
      try {
        const response = await fetch(request, { cache: request.destination === 'script' || request.destination === 'style' ? 'no-cache' : 'default' });
        if (response.ok && response.type === 'basic') {
          const cache = await caches.open(STATIC_CACHE);
          await cache.put(request, response.clone());
        }
        return response;
      } catch { return null; }
    };
    if (cached) { event.waitUntil(fetchFresh()); return cached; }
    return (await fetchFresh()) || Response.error();
  })());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data?.json?.() || {}; } catch { payload = { body: event.data?.text?.() || '' }; }
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
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = clients.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) {
      await existing.focus();
      existing.postMessage({ type: 'STELLAR_NOTIFICATION_CLICK', url: target });
      return;
    }
    await self.clients.openWindow(target);
  })());
});
