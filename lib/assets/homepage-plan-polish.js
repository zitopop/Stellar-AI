(() => {
  'use strict';

  if (window.__stellarHomepagePlanPolishV1) return;
  window.__stellarHomepagePlanPolishV1 = true;

  const PLAN_COPY = {
    free: {
      badge: 'Try Stellar',
      bestFor: 'Best for testing the workspace before paying.',
      credits: '75 credits/day',
      cta: 'Start free',
      href: '/app?welcome=1',
      bullets: ['No card needed', 'Spark + Star models', 'Good for quick chats and small tasks']
    },
    starter: {
      badge: 'First paid step',
      bestFor: 'Best for regular users who want more monthly capacity.',
      credits: '5,000 credits/month',
      cta: 'Choose Starter',
      href: '/app?upgrade=starter',
      bullets: ['More room than Free', 'Good for regular writing and fixes', 'Simple entry price']
    },
    plus: {
      badge: 'Best value',
      bestFor: 'Best for builders and people using Stellar most days.',
      credits: '15,000 credits/month',
      cta: 'Choose Plus',
      href: '/app?upgrade=plus',
      bullets: ['Unlocks stronger Comet model', 'Better for code and website work', 'Main upgrade path']
    },
    pro: {
      badge: 'For serious work',
      bestFor: 'Best for heavy users, business tasks and bigger projects.',
      credits: '50,000 credits/month',
      cta: 'Choose Pro',
      href: '/app?upgrade=pro',
      bullets: ['Unlocks Nova model', 'Highest monthly capacity', 'Built for deep work']
    }
  };

  function $(selector, root = document) { return root.querySelector(selector); }
  function $$(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }

  function isHome() {
    return document.body?.classList?.contains('public-home') || /^\/(?:index\.html)?$/i.test(location.pathname);
  }

  function planKey(card) {
    const text = (card.textContent || '').toLowerCase();
    if (text.includes('free')) return 'free';
    if (text.includes('starter')) return 'starter';
    if (text.includes('plus')) return 'plus';
    if (text.includes('pro')) return 'pro';
    return '';
  }

  function injectStyles() {
    if ($('#stellar-homepage-plan-polish-style-v1')) return;
    const style = document.createElement('style');
    style.id = 'stellar-homepage-plan-polish-style-v1';
    style.textContent = `
      body.public-home .pricing-section{position:relative!important;}
      body.public-home .stellar-plan-sellbar{width:min(980px,100%);margin:0 auto 22px;padding:16px;border:1px solid rgba(185,173,255,.18);border-radius:22px;background:linear-gradient(135deg,rgba(139,124,246,.14),rgba(255,255,255,.035));display:grid;grid-template-columns:1.1fr .9fr;gap:14px;align-items:center;box-shadow:0 20px 70px rgba(0,0,0,.18)}
      body.public-home .stellar-plan-sellbar strong{display:block;color:#f7f8ff;font-size:clamp(22px,3.2vw,34px);line-height:1.05;letter-spacing:-.05em;margin-bottom:7px}
      body.public-home .stellar-plan-sellbar span{display:block;color:#aeb7c6;font-size:13px;line-height:1.55}
      body.public-home .stellar-plan-sellbar .stellar-plan-mini{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      body.public-home .stellar-plan-mini b{min-height:54px;display:grid;align-content:center;gap:2px;border:1px solid rgba(255,255,255,.09);border-radius:14px;background:rgba(8,10,16,.42);padding:8px 10px;color:#f4f6fb;font-size:12px;font-weight:900}
      body.public-home .stellar-plan-mini small{color:#8cf2ce;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}
      body.public-home .plan,.public-home .pricing-card,.public-home .plan-card{position:relative!important;overflow:hidden!important;display:flex!important;flex-direction:column!important;gap:10px!important;min-height:100%!important;}
      body.public-home .plan[data-stellar-plan="plus"],body.public-home .pricing-card[data-stellar-plan="plus"],body.public-home .plan-card[data-stellar-plan="plus"]{border-color:rgba(185,173,255,.42)!important;box-shadow:0 28px 90px rgba(139,124,246,.16)!important;}
      body.public-home .stellar-plan-badge{align-self:flex-start;min-height:28px;display:inline-flex;align-items:center;gap:6px;padding:0 10px;border:1px solid rgba(185,173,255,.22);border-radius:999px;background:rgba(185,173,255,.09);color:#e8e3ff;font-size:10px;font-weight:950;letter-spacing:.08em;text-transform:uppercase;}
      body.public-home .stellar-plan-badge::before{content:'✦';color:#b9adff;}
      body.public-home .stellar-plan-for{padding:12px;border:1px solid rgba(255,255,255,.08);border-radius:15px;background:rgba(255,255,255,.035);color:#c4cbd8;font-size:12px;line-height:1.55;}
      body.public-home .stellar-plan-credit{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:auto;padding:11px 12px;border:1px solid rgba(140,242,206,.18);border-radius:15px;background:rgba(140,242,206,.055);color:#eafff8;font-size:12px;font-weight:900;}
      body.public-home .stellar-plan-credit span{color:#8cf2ce;font-size:10px;text-transform:uppercase;letter-spacing:.08em;}
      body.public-home .stellar-plan-extra{display:grid;gap:7px;margin:0;padding:0;list-style:none;}
      body.public-home .stellar-plan-extra li{display:flex;gap:8px;align-items:flex-start;color:#aeb7c5!important;font-size:12px!important;line-height:1.45!important;}
      body.public-home .stellar-plan-extra li::before{content:'✓';color:#8cf2ce;font-weight:900;}
      body.public-home .stellar-plan-cta{min-height:44px!important;width:100%!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;border-radius:13px!important;text-decoration:none!important;font-weight:900!important;margin-top:4px!important;background:#f3f0ff!important;color:#101218!important;border:1px solid #f3f0ff!important;}
      body.public-home .stellar-plan-cta.secondary{background:transparent!important;color:#e7e9f1!important;border-color:rgba(255,255,255,.12)!important;}
      body.public-home .stellar-credit-topup-strip{width:min(980px,100%);margin:18px auto 0;padding:14px;border:1px solid rgba(255,255,255,.09);border-radius:18px;background:rgba(255,255,255,.03);display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center;color:#aeb7c5;font-size:12px;line-height:1.5;text-align:center;}
      body.public-home .stellar-credit-topup-strip strong{color:#f5f7fb;}
      body.public-home .stellar-credit-topup-strip a{min-height:36px;display:inline-flex;align-items:center;justify-content:center;padding:0 12px;border-radius:999px;background:rgba(185,173,255,.10);border:1px solid rgba(185,173,255,.18);color:#e4dfff;text-decoration:none;font-weight:900;}
      @media(max-width:820px){body.public-home .stellar-plan-sellbar{grid-template-columns:1fr}body.public-home .stellar-plan-sellbar .stellar-plan-mini{grid-template-columns:1fr 1fr 1fr}}
      @media(max-width:560px){body.public-home .stellar-plan-sellbar .stellar-plan-mini{grid-template-columns:1fr}body.public-home .stellar-credit-topup-strip{display:grid;text-align:left}}
    `;
    document.head.appendChild(style);
  }

  function addSellbar(pricing) {
    if (!pricing || $('#stellar-plan-sellbar')) return;
    const bar = document.createElement('div');
    bar.id = 'stellar-plan-sellbar';
    bar.className = 'stellar-plan-sellbar';
    bar.innerHTML = `
      <div><strong>Pick the amount of AI power you need.</strong><span>Start free, then upgrade when you need more credits, stronger models or bigger project work. Keep credit top-ups separate so users understand what they are buying.</span></div>
      <div class="stellar-plan-mini" aria-label="Plan highlights"><b><small>Free</small>75/day</b><b><small>Plus</small>Best value</b><b><small>Top-ups</small>Keep working</b></div>
    `;
    const heading = $('.pricing-heading', pricing) || pricing.firstElementChild;
    (heading || pricing).insertAdjacentElement('afterend', bar);
  }

  function improvePlan(card) {
    const key = planKey(card);
    const data = PLAN_COPY[key];
    if (!data || card.dataset.stellarPlanPolished === 'true') return;
    card.dataset.stellarPlanPolished = 'true';
    card.dataset.stellarPlan = key;

    const badge = document.createElement('div');
    badge.className = 'stellar-plan-badge';
    badge.textContent = data.badge;
    card.prepend(badge);

    const forBox = document.createElement('div');
    forBox.className = 'stellar-plan-for';
    forBox.textContent = data.bestFor;

    const credit = document.createElement('div');
    credit.className = 'stellar-plan-credit';
    credit.innerHTML = `<span>Credits</span><strong>${data.credits}</strong>`;

    const list = document.createElement('ul');
    list.className = 'stellar-plan-extra';
    list.innerHTML = data.bullets.map(item => `<li>${item}</li>`).join('');

    const cta = document.createElement('a');
    cta.className = 'stellar-plan-cta' + (key === 'free' ? ' secondary' : '');
    cta.href = data.href;
    cta.textContent = data.cta;

    const title = card.querySelector('h2,h3') || card.firstElementChild;
    if (title) title.insertAdjacentElement('afterend', forBox); else card.appendChild(forBox);
    card.append(credit, list, cta);
  }

  function addTopupStrip(pricing) {
    if (!pricing || $('#stellar-credit-topup-strip')) return;
    const strip = document.createElement('div');
    strip.id = 'stellar-credit-topup-strip';
    strip.className = 'stellar-credit-topup-strip';
    strip.innerHTML = `<strong>Credits are clear:</strong> plan credits come monthly, wallet top-ups let users continue instantly, and Free lets people try Stellar without a card. <a href="/plans#credits">See credit packs</a>`;
    pricing.appendChild(strip);
  }

  function run() {
    if (!isHome()) return;
    injectStyles();
    const pricing = document.querySelector('#plans,.pricing-section,[aria-labelledby*="pricing" i]') || document.querySelector('.plans')?.closest('section');
    if (!pricing) return;
    addSellbar(pricing);
    $$('.plan,.pricing-card,.plan-card', pricing).forEach(improvePlan);
    addTopupStrip(pricing);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
  window.addEventListener('pageshow', run);
  setTimeout(run, 600);
  setTimeout(run, 1800);
})();
