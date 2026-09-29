(() => {
  'use strict';

  if (window.__stellarHomepagePlanPolishV3) return;
  window.__stellarHomepagePlanPolishV3 = true;

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

  const DECISION_CARDS = [
    ['Just trying?', 'Start with Free', 'Use daily credits, test the chat, then upgrade only when you need more.'],
    ['Using it weekly?', 'Starter', 'Good first paid step for regular writing, small fixes and planning.'],
    ['Building most days?', 'Plus', 'Best value for code, website work, stronger model access and bigger tasks.'],
    ['Heavy business work?', 'Pro', 'Maximum credits and strongest model access for deeper projects.']
  ];

  function $(selector, root = document) { return root.querySelector(selector); }
  function $$(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }

  function isHomeOrPlans() {
    return document.body?.classList?.contains('public-home') || /^\/(?:index\.html|plans(?:\.html)?)?$/i.test(location.pathname);
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
    if ($('#stellar-homepage-plan-polish-style-v3')) return;
    const style = document.createElement('style');
    style.id = 'stellar-homepage-plan-polish-style-v3';
    style.textContent = `
      body.public-home .pricing-section,.pricing-section{position:relative!important;}
      body.public-home .grid,body.public-home .cards,body.public-home .feature-grid,body.public-home .use-grid,body.public-home .how-grid,body.public-home .benefit-grid,body.public-home .pricing-grid,body.public-home .plans-grid{align-items:stretch!important;gap:clamp(12px,2vw,18px)!important;}
      body.public-home .card,body.public-home .feature-card,body.public-home .use-card,body.public-home .benefit-card,body.public-home .proof-card,body.public-home .step-card,body.public-home .oa2-card,body.public-home .landing-card,body.public-home .pricing-card,body.public-home .plan-card,body.public-home article.card,body.public-home section article:not(.msg){position:relative!important;min-width:0!important;min-height:100%!important;border:1px solid rgba(255,255,255,.085)!important;border-radius:22px!important;background:linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.022))!important;box-shadow:0 18px 60px rgba(0,0,0,.16)!important;padding:clamp(15px,2.2vw,20px)!important;overflow:hidden!important;display:flex!important;flex-direction:column!important;gap:10px!important;transition:transform .16s ease,border-color .16s ease,background .16s ease,box-shadow .16s ease!important;}
      body.public-home .card::before,body.public-home .feature-card::before,body.public-home .use-card::before,body.public-home .benefit-card::before,body.public-home .proof-card::before,body.public-home .step-card::before,body.public-home .oa2-card::before,body.public-home .landing-card::before,body.public-home .pricing-card::before,body.public-home .plan-card::before{content:'';position:absolute;inset:0 0 auto;height:1px;background:linear-gradient(90deg,transparent,rgba(185,173,255,.42),transparent);opacity:.65;pointer-events:none;}
      body.public-home .card:hover,body.public-home .feature-card:hover,body.public-home .use-card:hover,body.public-home .benefit-card:hover,body.public-home .proof-card:hover,body.public-home .step-card:hover,body.public-home .oa2-card:hover,body.public-home .landing-card:hover,body.public-home .pricing-card:hover,body.public-home .plan-card:hover{transform:translateY(-2px)!important;border-color:rgba(185,173,255,.22)!important;background:linear-gradient(180deg,rgba(255,255,255,.075),rgba(255,255,255,.028))!important;box-shadow:0 24px 80px rgba(0,0,0,.22)!important;}
      body.public-home .card h2,body.public-home .card h3,body.public-home .feature-card h2,body.public-home .feature-card h3,body.public-home .use-card h2,body.public-home .use-card h3,body.public-home .benefit-card h2,body.public-home .benefit-card h3,body.public-home .proof-card h2,body.public-home .proof-card h3,body.public-home .step-card h2,body.public-home .step-card h3,body.public-home .oa2-card h2,body.public-home .oa2-card h3,body.public-home .landing-card h2,body.public-home .landing-card h3{margin:0!important;color:#f7f8ff!important;font-size:clamp(17px,2.2vw,22px)!important;line-height:1.12!important;letter-spacing:-.035em!important;}
      body.public-home .card p,body.public-home .feature-card p,body.public-home .use-card p,body.public-home .benefit-card p,body.public-home .proof-card p,body.public-home .step-card p,body.public-home .oa2-card p,body.public-home .landing-card p{margin:0!important;color:#aeb7c6!important;font-size:13px!important;line-height:1.58!important;}
      body.public-home .card small,body.public-home .feature-card small,body.public-home .use-card small,body.public-home .benefit-card small,body.public-home .proof-card small,body.public-home .step-card small,body.public-home .oa2-card small,body.public-home .landing-card small{display:block!important;color:#8791a1!important;font-size:12px!important;line-height:1.45!important;}
      body.public-home .card a,body.public-home .feature-card a,body.public-home .use-card a,body.public-home .benefit-card a,body.public-home .proof-card a,body.public-home .step-card a,body.public-home .oa2-card a,body.public-home .landing-card a{margin-top:auto!important;}
      body.public-home .section,body.public-home section{scroll-margin-top:86px!important;}
      .stellar-plan-sellbar,.stellar-plan-decision,.stellar-pricing-faq,.stellar-credit-topup-strip{width:min(980px,100%);margin-inline:auto;}
      .stellar-plan-sellbar{margin-bottom:22px;padding:16px;border:1px solid rgba(185,173,255,.18);border-radius:22px;background:linear-gradient(135deg,rgba(139,124,246,.14),rgba(255,255,255,.035));display:grid;grid-template-columns:1.1fr .9fr;gap:14px;align-items:center;box-shadow:0 20px 70px rgba(0,0,0,.18)}
      .stellar-plan-sellbar strong{display:block;color:#f7f8ff;font-size:clamp(22px,3.2vw,34px);line-height:1.05;letter-spacing:-.05em;margin-bottom:7px}
      .stellar-plan-sellbar span{display:block;color:#aeb7c6;font-size:13px;line-height:1.55}
      .stellar-plan-mini{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      .stellar-plan-mini b{min-height:54px;display:grid;align-content:center;gap:2px;border:1px solid rgba(255,255,255,.09);border-radius:14px;background:rgba(8,10,16,.42);padding:8px 10px;color:#f4f6fb;font-size:12px;font-weight:900}
      .stellar-plan-mini small{color:#8cf2ce;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}
      body.public-home .plan,.pricing-card,.plan-card{position:relative!important;overflow:hidden!important;display:flex!important;flex-direction:column!important;gap:10px!important;min-height:100%!important;}
      body.public-home .plan[data-stellar-plan="plus"],.pricing-card[data-stellar-plan="plus"],.plan-card[data-stellar-plan="plus"]{border-color:rgba(185,173,255,.42)!important;box-shadow:0 28px 90px rgba(139,124,246,.16)!important;}
      .stellar-plan-badge{align-self:flex-start;min-height:28px;display:inline-flex;align-items:center;gap:6px;padding:0 10px;border:1px solid rgba(185,173,255,.22);border-radius:999px;background:rgba(185,173,255,.09);color:#e8e3ff;font-size:10px;font-weight:950;letter-spacing:.08em;text-transform:uppercase;}
      .stellar-plan-badge::before{content:'✦';color:#b9adff;}
      .stellar-plan-for{padding:12px;border:1px solid rgba(255,255,255,.08);border-radius:15px;background:rgba(255,255,255,.035);color:#c4cbd8;font-size:12px;line-height:1.55;}
      .stellar-plan-credit{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:auto;padding:11px 12px;border:1px solid rgba(140,242,206,.18);border-radius:15px;background:rgba(140,242,206,.055);color:#eafff8;font-size:12px;font-weight:900;}
      .stellar-plan-credit span{color:#8cf2ce;font-size:10px;text-transform:uppercase;letter-spacing:.08em;}
      .stellar-plan-extra{display:grid;gap:7px;margin:0;padding:0;list-style:none;}
      .stellar-plan-extra li{display:flex;gap:8px;align-items:flex-start;color:#aeb7c5!important;font-size:12px!important;line-height:1.45!important;}
      .stellar-plan-extra li::before{content:'✓';color:#8cf2ce;font-weight:900;}
      .stellar-plan-cta{min-height:44px!important;width:100%!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;border-radius:13px!important;text-decoration:none!important;font-weight:900!important;margin-top:4px!important;background:#f3f0ff!important;color:#101218!important;border:1px solid #f3f0ff!important;}
      .stellar-plan-cta.secondary{background:transparent!important;color:#e7e9f1!important;border-color:rgba(255,255,255,.12)!important;}
      .stellar-credit-topup-strip{margin-top:18px;padding:14px;border:1px solid rgba(255,255,255,.09);border-radius:18px;background:rgba(255,255,255,.03);display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center;color:#aeb7c5;font-size:12px;line-height:1.5;text-align:center;}
      .stellar-credit-topup-strip strong{color:#f5f7fb;}
      .stellar-credit-topup-strip a{min-height:36px;display:inline-flex;align-items:center;justify-content:center;padding:0 12px;border-radius:999px;background:rgba(185,173,255,.10);border:1px solid rgba(185,173,255,.18);color:#e4dfff;text-decoration:none;font-weight:900;}
      .stellar-plan-decision{margin-top:22px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;}
      .stellar-plan-decision article{padding:15px;border:1px solid rgba(255,255,255,.09);border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.018));}
      .stellar-plan-decision span{display:inline-flex;margin-bottom:14px;color:#8cf2ce;font-size:10px;font-weight:950;letter-spacing:.08em;text-transform:uppercase;}
      .stellar-plan-decision strong{display:block;color:#f4f6fb;font-size:16px;letter-spacing:-.03em;margin-bottom:5px;}
      .stellar-plan-decision p{margin:0;color:#aab3c2;font-size:12px;line-height:1.55;}
      .stellar-pricing-faq{margin-top:18px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;}
      .stellar-pricing-faq details{padding:14px;border:1px solid rgba(255,255,255,.09);border-radius:16px;background:rgba(255,255,255,.03);}
      .stellar-pricing-faq summary{cursor:pointer;color:#f2f4f8;font-size:13px;font-weight:900;}
      .stellar-pricing-faq p{margin:8px 0 0;color:#aeb7c6;font-size:12px;line-height:1.55;}
      .stellar-plan-sticky{position:fixed;left:50%;bottom:max(14px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:35;width:min(720px,calc(100% - 22px));display:none;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border:1px solid rgba(185,173,255,.22);border-radius:18px;background:rgba(10,12,18,.88);backdrop-filter:blur(18px);box-shadow:0 24px 80px rgba(0,0,0,.35);}
      .stellar-plan-sticky span{color:#d7dce7;font-size:12px;font-weight:850;}.stellar-plan-sticky a{min-height:38px;display:inline-flex;align-items:center;justify-content:center;padding:0 13px;border-radius:12px;background:#f3f0ff;color:#101218;text-decoration:none;font-size:12px;font-weight:950;}
      body.public-home.stellar-show-plan-sticky .stellar-plan-sticky{display:flex;}
      @media(max-width:900px){body.public-home .grid,body.public-home .cards,body.public-home .feature-grid,body.public-home .use-grid,body.public-home .how-grid,body.public-home .benefit-grid,body.public-home .pricing-grid,body.public-home .plans-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.stellar-plan-decision,.stellar-pricing-faq{grid-template-columns:1fr 1fr}.stellar-plan-sellbar{grid-template-columns:1fr}.stellar-plan-mini{grid-template-columns:1fr 1fr 1fr}}
      @media(max-width:560px){body.public-home .grid,body.public-home .cards,body.public-home .feature-grid,body.public-home .use-grid,body.public-home .how-grid,body.public-home .benefit-grid,body.public-home .pricing-grid,body.public-home .plans-grid,.stellar-plan-decision,.stellar-pricing-faq,.stellar-plan-mini{grid-template-columns:1fr!important}body.public-home .card,body.public-home .feature-card,body.public-home .use-card,body.public-home .benefit-card,body.public-home .proof-card,body.public-home .step-card,body.public-home .oa2-card,body.public-home .landing-card,body.public-home .pricing-card,body.public-home .plan-card{border-radius:18px!important;padding:15px!important}.stellar-credit-topup-strip{display:grid;text-align:left}.stellar-plan-sticky{display:none!important}}
    `;
    document.head.appendChild(style);
  }

  function addSellbar(pricing) {
    if (!pricing || $('#stellar-plan-sellbar')) return;
    const bar = document.createElement('div');
    bar.id = 'stellar-plan-sellbar';
    bar.className = 'stellar-plan-sellbar';
    bar.innerHTML = `<div><strong>Pick the amount of AI power you need.</strong><span>Start free, then upgrade when you need more credits, stronger models or bigger project work. Keep credit top-ups separate so users understand what they are buying.</span></div><div class="stellar-plan-mini" aria-label="Plan highlights"><b><small>Free</small>75/day</b><b><small>Plus</small>Best value</b><b><small>Top-ups</small>Keep working</b></div>`;
    const heading = $('.pricing-heading', pricing) || pricing.firstElementChild;
    (heading || pricing).insertAdjacentElement('afterend', bar);
  }

  function improvePlan(card) {
    const key = planKey(card);
    const data = PLAN_COPY[key];
    if (!data || card.dataset.stellarPlanPolished === 'v3') return;
    card.dataset.stellarPlanPolished = 'v3';
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
    cta.dataset.stellarPlanCta = key;
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

  function addDecisionGuide(pricing) {
    if (!pricing || $('#stellar-plan-decision')) return;
    const wrap = document.createElement('div');
    wrap.id = 'stellar-plan-decision';
    wrap.className = 'stellar-plan-decision';
    wrap.innerHTML = DECISION_CARDS.map(([kicker, title, copy]) => `<article><span>${kicker}</span><strong>${title}</strong><p>${copy}</p></article>`).join('');
    const strip = $('#stellar-credit-topup-strip', pricing);
    (strip || pricing).insertAdjacentElement(strip ? 'afterend' : 'beforeend', wrap);
  }

  function addPricingFaq(pricing) {
    if (!pricing || $('#stellar-pricing-faq')) return;
    const faq = document.createElement('div');
    faq.id = 'stellar-pricing-faq';
    faq.className = 'stellar-pricing-faq';
    faq.innerHTML = `
      <details><summary>What happens when credits run out?</summary><p>The user can wait for the next reset/monthly allowance or buy wallet credits to keep working instantly.</p></details>
      <details><summary>Why is Plus highlighted?</summary><p>Plus is the main upgrade path because it gives more monthly credits and stronger model access for regular work.</p></details>
      <details><summary>Can people start without paying?</summary><p>Yes. Free is for trying Stellar first, then upgrading only when the user needs more capacity.</p></details>`;
    pricing.appendChild(faq);
  }

  function addSticky(pricing) {
    if (!pricing || $('#stellar-plan-sticky')) return;
    const sticky = document.createElement('div');
    sticky.id = 'stellar-plan-sticky';
    sticky.className = 'stellar-plan-sticky';
    sticky.innerHTML = '<span>Ready to try Stellar? Start free, upgrade when you need more.</span><a href="/app?welcome=1">Start free</a>';
    document.body.appendChild(sticky);
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.some(entry => entry.isIntersecting);
      document.body.classList.toggle('stellar-show-plan-sticky', visible);
    }, { threshold: 0.18 });
    observer.observe(pricing);
  }

  function run() {
    if (!isHomeOrPlans()) return;
    injectStyles();
    const pricing = document.querySelector('#plans,.pricing-section,[aria-labelledby*="pricing" i]') || document.querySelector('.plans')?.closest('section');
    if (!pricing) return;
    addSellbar(pricing);
    $$('.plan,.pricing-card,.plan-card', pricing).forEach(improvePlan);
    addTopupStrip(pricing);
    addDecisionGuide(pricing);
    addPricingFaq(pricing);
    addSticky(pricing);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
  window.addEventListener('pageshow', run);
  setTimeout(run, 600);
  setTimeout(run, 1800);
  setTimeout(run, 3500);
})();