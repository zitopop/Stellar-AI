(() => {
  'use strict';
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('mobile-nav');
  function closeMenu(restoreFocus = false) {
    if (!toggle || !menu) return;
    const wasOpen = !menu.hidden;
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation menu');
    if (restoreFocus && wasOpen) toggle.focus();
  }
  toggle?.addEventListener('click', () => {
    const open = menu.hidden;
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
  });
  menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu()));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(true); });
  window.matchMedia('(min-width: 701px)').addEventListener('change', event => { if (event.matches) closeMenu(); });

  const examples = {
    fivem: {
      title: 'A better roleplay server', starter: 'police',
      prompt: 'Create a QBCore police job with duty controls, cuffing and a configurable jail timer.',
      response: 'Let’s give your city a proper police system. Here’s how I’d organise the resource.',
      files: ['config.lua', 'client/main.lua', 'server/main.lua', 'fxmanifest.lua', 'README.md'],
      code: "-- Make it your own.\nConfig = {}\n\nConfig.Job = 'police'\nConfig.UseTarget = true\n\nConfig.Duty = {\n  label = 'Los Santos Police',\n  requireOnDuty = true\n}"
    },
    roblox: {
      title: 'Your next Roblox world', starter: 'roblox',
      prompt: 'Build a Roblox coin collection system with saved progress and a simple player HUD.',
      response: 'Let’s build the collection loop, keep progress on the server and give players a clear HUD.',
      files: ['CoinConfig.lua', 'CoinService.lua', 'CoinHUD.client.lua', 'README.md'],
      code: "-- Shared configuration\nlocal CoinConfig = {}\n\nCoinConfig.Value = 10\nCoinConfig.RespawnSeconds = 30\nCoinConfig.SaveInterval = 60\n\nreturn CoinConfig"
    },
    fix: {
      title: 'A clearer path through the error', starter: 'fix',
      prompt: 'My QBCore script throws “attempt to index a nil value”. Help me find the cause and fix it.',
      response: 'First, check whether the player exists before reading their data. Then test the failed lookup too.',
      files: ['server/main.lua', 'TESTING.md'],
      code: "-- Validate the lookup first.\nlocal player =\n  QBCore.Functions.GetPlayer(src)\n\nif not player then\n  return\nend\n\nlocal job = player.PlayerData.job"
    }
  };
  const buttons = [...document.querySelectorAll('[data-example]')];
  function selectExample(key) {
    const example = examples[key];
    if (!example) return;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.example === key)));
    document.getElementById('example-title').textContent = example.title;
    document.getElementById('example-prompt').textContent = example.prompt;
    document.getElementById('example-response').textContent = example.response;
    document.getElementById('example-open').href = `/app?starter=${example.starter}`;
    document.getElementById('file-count').textContent = `${example.files.length} files`;
    document.getElementById('code-filename').textContent = example.files[0];
    // Example data never enters the app as generated output or an executed request.
    const list = document.getElementById('file-list');
    list.replaceChildren(...example.files.map((name, index) => {
      const file = document.createElement('span');
      file.className = `file${index === 0 ? ' active' : ''}`;
      const icon = document.createElement('i');
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = name.endsWith('.md') ? '≡' : '◇';
      file.append(icon, document.createTextNode(` ${name}`));
      return file;
    }));
    const code = document.getElementById('example-code');
    code.replaceChildren();
    // Small, text-only highlighter; user content is never inserted as markup.
    example.code.split(/(--[^\n]*|'[^']*'|\b(?:local|return|if|then|end|true|Config)\b)/g).forEach(token => {
      if (/^(--|'|local$|return$|if$|then$|end$|true$|Config$)/.test(token)) {
        const span = document.createElement('span');
        span.className = token.startsWith('--') ? 'code-comment' : token.startsWith("'") ? 'code-green' : 'code-gold';
        span.textContent = token;
        code.append(span);
      } else code.append(document.createTextNode(token));
    });
  }
  buttons.forEach(button => button.addEventListener('click', () => selectExample(button.dataset.example)));

  const form = document.getElementById('build-form');
  const prompt = document.getElementById('build-prompt');
  form?.addEventListener('submit', event => {
    const value = prompt.value.trim().slice(0, 2000);
    if (!value) {
      event.preventDefault();
      prompt.setCustomValidity('Describe what you want to build.');
      prompt.reportValidity();
      return;
    }
    prompt.value = value;
  });
  prompt?.addEventListener('input', () => prompt.setCustomValidity(''));

  function addRevenueConversionLayer() {
    if (!document.body.classList.contains('public-home') || document.getElementById('stellar-revenue-selector')) return;
    const hero = document.querySelector('.oa2-hero');
    if (!hero) return;

    const style = document.createElement('style');
    style.id = 'stellar-revenue-conversion-css';
    style.textContent = `
      body.public-home .stellar-money-cta-row{display:flex!important;justify-content:center!important;flex-wrap:wrap!important;gap:10px!important;margin:18px auto 0!important;width:min(780px,100%)!important}
      body.public-home .stellar-money-cta{min-height:44px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;padding:0 15px!important;border:1px solid rgba(255,255,255,.11)!important;border-radius:999px!important;background:rgba(17,20,30,.78)!important;color:#f4f5fb!important;font-size:12px!important;font-weight:850!important;letter-spacing:-.01em!important;text-decoration:none!important;box-shadow:0 14px 44px rgba(0,0,0,.18)!important;transition:transform .16s ease,border-color .16s ease,background .16s ease!important}
      body.public-home .stellar-money-cta:hover{transform:translateY(-2px)!important;border-color:rgba(176,164,255,.36)!important;background:#171a24!important}
      body.public-home .stellar-money-cta.primary{background:#f0edff!important;color:#111218!important;border-color:#f0edff!important}
      body.public-home .stellar-revenue-selector{padding:clamp(44px,7vw,90px) 0!important;border-top:1px solid rgba(255,255,255,.06)!important;border-bottom:1px solid rgba(255,255,255,.06)!important;background:radial-gradient(720px 280px at 50% 0%,rgba(139,124,246,.13),transparent 70%)!important}
      body.public-home .stellar-revenue-wrap{width:min(1160px,calc(100% - 40px))!important;margin-inline:auto!important}
      body.public-home .stellar-revenue-head{max-width:780px!important;margin:0 auto 24px!important;text-align:center!important}
      body.public-home .stellar-revenue-kicker{display:inline-flex!important;margin-bottom:11px!important;color:#a99fff!important;font-size:10px!important;font-weight:900!important;letter-spacing:.16em!important;text-transform:uppercase!important}
      body.public-home .stellar-revenue-head h2{margin:0!important;color:#f6f7fb!important;font-size:clamp(34px,5vw,62px)!important;line-height:1!important;letter-spacing:-.058em!important;font-weight:760!important}
      body.public-home .stellar-revenue-head p{max-width:650px!important;margin:14px auto 0!important;color:#aeb6c4!important;font-size:16px!important;line-height:1.7!important}
      body.public-home .stellar-revenue-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:12px!important}
      body.public-home .stellar-revenue-card{min-height:330px!important;display:flex!important;flex-direction:column!important;padding:22px!important;border:1px solid rgba(255,255,255,.085)!important;border-radius:22px!important;background:linear-gradient(180deg,rgba(20,23,32,.96),rgba(12,14,20,.98))!important;box-shadow:0 24px 80px rgba(0,0,0,.22)!important;text-decoration:none!important;color:inherit!important;transition:transform .16s ease,border-color .16s ease!important}
      body.public-home .stellar-revenue-card:hover{transform:translateY(-4px)!important;border-color:rgba(169,159,255,.34)!important}
      body.public-home .stellar-revenue-card b{width:42px!important;height:42px!important;display:grid!important;place-items:center!important;border-radius:15px!important;border:1px solid rgba(169,159,255,.22)!important;background:#1d1b2d!important;color:#c9c2ff!important;font-size:18px!important;margin-bottom:26px!important}
      body.public-home .stellar-revenue-card h3{margin:0 0 10px!important;color:#fff!important;font-size:24px!important;line-height:1.05!important;letter-spacing:-.04em!important}
      body.public-home .stellar-revenue-card p{margin:0!important;color:#aab2c0!important;line-height:1.7!important;font-size:14px!important}
      body.public-home .stellar-revenue-card ul{margin:18px 0 0!important;padding:0!important;list-style:none!important;display:grid!important;gap:8px!important;color:#d5dbea!important;font-size:13px!important;line-height:1.45!important}
      body.public-home .stellar-revenue-card li{display:flex!important;gap:8px!important;align-items:flex-start!important}
      body.public-home .stellar-revenue-card li::before{content:'✓';color:#9ff0c6;font-weight:900!important}
      body.public-home .stellar-revenue-card span{margin-top:auto!important;min-height:44px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;border-radius:12px!important;background:#f0edff!important;color:#111218!important;font-size:12px!important;font-weight:900!important}
      body.public-home .stellar-revenue-foot{margin:18px auto 0!important;max-width:760px!important;text-align:center!important;color:#8d96a6!important;font-size:12px!important;line-height:1.7!important}
      @media(max-width:900px){body.public-home .stellar-revenue-grid{grid-template-columns:1fr!important}body.public-home .stellar-revenue-card{min-height:auto!important}}
      @media(max-width:640px){body.public-home .stellar-money-cta-row{display:grid!important;grid-template-columns:1fr!important}body.public-home .stellar-money-cta{width:100%!important;border-radius:14px!important}body.public-home .stellar-revenue-wrap{width:min(100% - 24px,1160px)!important}body.public-home .stellar-revenue-card{padding:19px!important}}
    `;
    document.head.append(style);

    const makeNode = (tagName, className, text) => {
      const node = document.createElement(tagName);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    };
    const makeLink = (href, className, text) => {
      const link = makeNode('a', className, text);
      link.href = href;
      return link;
    };
    const makeOfferCard = ({ href, icon, title, description, bullets, cta }) => {
      const card = makeLink(href, 'stellar-revenue-card');
      const badge = makeNode('b', '', icon);
      const heading = makeNode('h3', '', title);
      const copy = makeNode('p', '', description);
      const list = document.createElement('ul');
      list.append(...bullets.map(point => makeNode('li', '', point)));
      const action = makeNode('span', '', cta);
      card.append(badge, heading, copy, list, action);
      return card;
    };

    const moneyRow = makeNode('div', 'stellar-money-cta-row');
    moneyRow.setAttribute('aria-label', 'Business AI offers');
    moneyRow.append(
      makeLink('/ai-receptionist', 'stellar-money-cta primary', 'Sell AI receptionist'),
      makeLink('/ai-inbox-closer', 'stellar-money-cta', 'Close inbox leads'),
      makeLink('/small-business-ai', 'stellar-money-cta', 'Small business AI')
    );
    const heroActions = hero.querySelector('.oa2-hero-actions') || hero.querySelector('.oa2-composer') || hero.lastElementChild;
    heroActions?.insertAdjacentElement('afterend', moneyRow);

    const selector = makeNode('section', 'stellar-revenue-selector');
    selector.id = 'stellar-revenue-selector';
    selector.setAttribute('aria-labelledby', 'stellar-revenue-title');

    const wrap = makeNode('div', 'stellar-revenue-wrap');
    const head = makeNode('div', 'stellar-revenue-head');
    const kicker = makeNode('span', 'stellar-revenue-kicker', 'Make Stellar useful first');
    const title = makeNode('h2', '', 'Pick the AI worker that makes money.');
    title.id = 'stellar-revenue-title';
    const summary = makeNode('p', '', 'Visitors should not have to guess what Stellar does. These three offers turn the site into a simple business funnel: answer calls, handle enquiries, and follow up leads.');
    head.append(kicker, title, summary);

    const grid = makeNode('div', 'stellar-revenue-grid');
    grid.append(
      makeOfferCard({
        href: '/ai-receptionist',
        icon: '☎',
        title: 'AI receptionist',
        description: 'For businesses missing calls, messages and bookings. Clear offer, easy to understand, easiest to sell monthly.',
        bullets: ['Lead capture', 'Customer questions', 'Booking-style enquiries'],
        cta: 'View receptionist offer'
      }),
      makeOfferCard({
        href: '/ai-inbox-closer',
        icon: '@',
        title: 'Inbox closer',
        description: 'For businesses with replies, quotes and leads that need tidy follow-up instead of forgotten messages.',
        bullets: ['Reply drafting', 'Lead summaries', 'Approval before sending'],
        cta: 'View inbox offer'
      }),
      makeOfferCard({
        href: '/small-business-ai',
        icon: '✦',
        title: 'Small business AI',
        description: 'For owners who want one AI workspace for support, websites, content, admin and simple automation.',
        bullets: ['Website help', 'Support workflows', 'Business automation'],
        cta: 'View business offer'
      })
    );

    const foot = makeNode('p', 'stellar-revenue-foot', 'Start with a free test in the app, then upgrade to plans or credits when Stellar saves real time. High-impact actions stay approved and controlled.');
    wrap.append(head, grid, foot);
    selector.append(wrap);
    hero.insertAdjacentElement('afterend', selector);

    document.querySelectorAll('.nav-links, #mobile-nav').forEach(nav => {
      if (!nav || nav.querySelector('a[href="/ai-receptionist"]')) return;
      const link = document.createElement('a');
      link.href = '/ai-receptionist';
      link.textContent = 'AI receptionist';
      nav.prepend(link);
    });
  }
  addRevenueConversionLayer();

  // Preserve referral attribution when a visitor moves into the app.
  const ref = new URLSearchParams(location.search).get('ref');
  if (ref && /^[A-Za-z0-9_-]{1,100}$/.test(ref)) {
    document.querySelectorAll('a[href^="/app"]').forEach(link => {
      const url = new URL(link.getAttribute('href'), location.origin);
      url.searchParams.set('ref', ref);
      link.href = url.pathname + url.search;
    });
    const input = document.createElement('input');
    input.type = 'hidden'; input.name = 'ref'; input.value = ref;
    form?.append(input);
    buttons.forEach(button => button.addEventListener('click', () => {
      const link = document.getElementById('example-open');
      const url = new URL(link.href);
      url.searchParams.set('ref', ref);
      link.href = url.pathname + url.search;
    }));
  }
  if ('serviceWorker' in navigator && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {});
  }
})();