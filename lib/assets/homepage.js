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
    example.code.split(/(--[^\n]*|'[^']*'|\b(?:local|return|if|then|end|true|Config)\b)/g).forEach(token => {
      if (/^(--|'|local$|return$|if$|then$|end$|true$|Config$)/.test(token)) {
        const span = document.createElement('span');
        span.className = token.startsWith('--') ? 'code-comment' : token.startsWith("'") ? 'code-green' : 'code-gold';
        span.textContent = token;
        code.append(span);
      } else {
        code.append(document.createTextNode(token));
      }
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

  function applyHomePagePolish() {
    if (!document.body.classList.contains('public-home')) return;

    const hero = document.querySelector('.oa2-hero');
    if (!hero || hero.dataset.stellarPolished === 'true') return;
    hero.dataset.stellarPolished = 'true';

    const title = document.getElementById('hero-title');
    if (title) title.textContent = 'Get work done with AI you control.';

    const lead = hero.querySelector('.oa2-lead');
    if (lead) {
      lead.textContent = 'Plan, write, build, support customers and improve your website from one clean workspace. Connect tools only when useful and approve higher-impact actions before they run.';
    }

    const wordmark = hero.querySelector('.oa2-wordmark');
    if (wordmark) wordmark.textContent = 'STELLAR AI · BUSINESS WORKSPACE';

    if (prompt) {
      prompt.placeholder = 'Ask Stellar to improve my website, reply to a lead, build a workflow, or fix a bug...';
      prompt.setAttribute('aria-label', 'Tell Stellar AI what you want to get done');
    }

    const startNote = hero.querySelector('.oa2-start-note');
    if (startNote) startNote.textContent = 'Free to start · no card required · upgrade only when useful';

    const proof = hero.querySelector('.oa2-hero-proof');
    if (proof) {
      proof.replaceChildren(...['AI receptionist', 'Inbox follow-up', 'Website fixes', 'Approved agents', 'Human review'].map(label => makeNode('span', '', label)));
    }

    const primary = hero.querySelector('.oa2-primary-action');
    if (primary) primary.textContent = 'Start free';

    const secondary = hero.querySelector('.oa2-secondary-action');
    if (secondary) secondary.textContent = 'View plans';

    if (!hero.querySelector('.stellar-mission-row')) {
      const missionRow = makeNode('div', 'stellar-mission-row');
      missionRow.setAttribute('aria-label', 'Fast ways to use Stellar AI');
      [
        { href: '/ai-receptionist', title: 'Get more enquiries answered', copy: 'AI receptionist offer', tag: 'CUSTOMERS' },
        { href: '/website-audit', title: 'Fix trust and conversion gaps', copy: 'Website mini audit', tag: 'WEBSITE' },
        { href: '/ai-inbox-closer', title: 'Follow up leads properly', copy: 'Inbox closer', tag: 'SALES' },
        { href: '/app?welcome=1', title: 'Open the workspace', copy: 'Ask, build and automate', tag: 'APP' }
      ].forEach(item => {
        const card = makeLink(item.href, 'stellar-mission-card');
        card.append(makeNode('span', '', item.tag), makeNode('strong', '', item.title), makeNode('small', '', item.copy));
        missionRow.append(card);
      });

      const anchor = hero.querySelector('.oa2-start-note') || form || proof;
      anchor?.insertAdjacentElement('afterend', missionRow);
    }
  }

  function addRevenueConversionLayer() {
    if (!document.body.classList.contains('public-home') || document.getElementById('stellar-revenue-selector')) return;
    const hero = document.querySelector('.oa2-hero');
    if (!hero) return;

    const style = document.createElement('style');
    style.id = 'stellar-revenue-conversion-css';
    style.textContent = `
      body.public-home .oa2-hero{position:relative!important;overflow:hidden!important}
      body.public-home .oa2-hero::before{content:'';position:absolute;inset:52px max(18px,4vw) auto;z-index:-1;height:min(420px,48vw);border-radius:42px;background:radial-gradient(closest-side at 50% 12%,rgba(146,126,255,.18),transparent 72%),linear-gradient(180deg,rgba(255,255,255,.03),transparent);filter:blur(.1px)}
      body.public-home .oa2-wordmark{display:inline-flex!important;align-items:center!important;gap:8px!important;padding:7px 10px!important;border:1px solid rgba(255,255,255,.09)!important;border-radius:999px!important;background:rgba(13,15,22,.72)!important;color:#b5addd!important}
      body.public-home .oa2-hero h1{max-width:860px!important}
      body.public-home .oa2-lead{max-width:720px!important}
      body.public-home .oa2-hero-proof{gap:9px!important}
      body.public-home .oa2-hero-proof span{background:rgba(16,19,28,.82)!important;border-color:rgba(177,164,255,.13)!important;color:#e7e9f4!important}
      body.public-home .stellar-mission-row{width:min(980px,100%)!important;margin:22px auto 0!important;display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:10px!important}
      body.public-home .stellar-mission-card{min-height:116px!important;padding:16px!important;display:flex!important;flex-direction:column!important;justify-content:space-between!important;border:1px solid rgba(255,255,255,.085)!important;border-radius:18px!important;background:linear-gradient(180deg,rgba(19,22,32,.92),rgba(12,14,20,.96))!important;color:inherit!important;text-decoration:none!important;box-shadow:0 18px 64px rgba(0,0,0,.18)!important;transition:transform .16s ease,border-color .16s ease,background .16s ease!important}
      body.public-home .stellar-mission-card:hover{transform:translateY(-3px)!important;border-color:rgba(169,159,255,.32)!important;background:#141722!important}
      body.public-home .stellar-mission-card span{color:#a99fff!important;font-size:10px!important;font-weight:900!important;letter-spacing:.14em!important}
      body.public-home .stellar-mission-card strong{color:#f7f8ff!important;font-size:15px!important;line-height:1.22!important;letter-spacing:-.02em!important}
      body.public-home .stellar-mission-card small{color:#98a2b4!important;font-size:12px!important;line-height:1.35!important}
      body.public-home .stellar-money-cta-row{display:flex!important;justify-content:center!important;flex-wrap:wrap!important;gap:10px!important;margin:18px auto 0!important;width:min(780px,100%)!important}
      body.public-home .stellar-money-cta{min-height:44px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;padding:0 15px!important;border:1px solid rgba(255,255,255,.11)!important;border-radius:999px!important;background:rgba(17,20,30,.78)!important;color:#f4f5fb!important;font-size:12px!important;font-weight:850!important;letter-spacing:-.01em!important;text-decoration:none!important;box-shadow:0 14px 44px rgba(0,0,0,.18)!important;transition:transform .16s ease,border-color .16s ease,background .16s ease!important}
      body.public-home .stellar-money-cta:hover{transform:translateY(-2px)!important;border-color:rgba(176,164,255,.36)!important;background:#171a24!important}
      body.public-home .stellar-money-cta.primary{background:#f0edff!important;color:#111218!important;border-color:#f0edff!important}
      body.public-home .stellar-revenue-selector{padding:clamp(50px,7vw,92px) 0!important;border-top:1px solid rgba(255,255,255,.06)!important;border-bottom:1px solid rgba(255,255,255,.06)!important;background:radial-gradient(720px 280px at 50% 0%,rgba(139,124,246,.13),transparent 70%)!important}
      body.public-home .stellar-revenue-wrap{width:min(1160px,calc(100% - 40px))!important;margin-inline:auto!important}
      body.public-home .stellar-revenue-head{max-width:820px!important;margin:0 auto 24px!important;text-align:center!important}
      body.public-home .stellar-revenue-kicker{display:inline-flex!important;margin-bottom:11px!important;color:#a99fff!important;font-size:10px!important;font-weight:900!important;letter-spacing:.16em!important;text-transform:uppercase!important}
      body.public-home .stellar-revenue-head h2{margin:0!important;color:#f6f7fb!important;font-size:clamp(34px,5vw,62px)!important;line-height:1!important;letter-spacing:-.058em!important;font-weight:760!important}
      body.public-home .stellar-revenue-head p{max-width:690px!important;margin:14px auto 0!important;color:#aeb6c4!important;font-size:16px!important;line-height:1.7!important}
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
      @media(max-width:980px){body.public-home .stellar-mission-row{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
      @media(max-width:900px){body.public-home .stellar-revenue-grid{grid-template-columns:1fr!important}body.public-home .stellar-revenue-card{min-height:auto!important}}
      @media(max-width:640px){body.public-home .stellar-mission-row{grid-template-columns:1fr!important;width:min(100% - 12px,520px)!important}body.public-home .stellar-mission-card{min-height:96px!important}body.public-home .stellar-money-cta-row{display:grid!important;grid-template-columns:1fr!important}body.public-home .stellar-money-cta{width:100%!important;border-radius:14px!important}body.public-home .stellar-revenue-wrap{width:min(100% - 24px,1160px)!important}body.public-home .stellar-revenue-card{padding:19px!important}}
    `;
    document.head.append(style);

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
    const kicker = makeNode('span', 'stellar-revenue-kicker', 'MAKE THE SITE SELL CLEARLY');
    const title = makeNode('h2', '', 'Three simple offers visitors understand fast.');
    title.id = 'stellar-revenue-title';
    const summary = makeNode('p', '', 'The landing page now points people at clear jobs Stellar can help with: answer enquiries, follow up leads, and support small business work with owner-approved AI actions.');
    head.append(kicker, title, summary);

    const grid = makeNode('div', 'stellar-revenue-grid');
    grid.append(
      makeOfferCard({
        href: '/ai-receptionist',
        icon: '☎',
        title: 'AI receptionist',
        description: 'For shops, salons, garages and small businesses that miss calls, messages or booking enquiries.',
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
        description: 'For owners who want one clean AI workspace for support, content, websites, admin and automation.',
        bullets: ['Website help', 'Support workflows', 'Business automation'],
        cta: 'View business offer'
      })
    );

    const foot = makeNode('p', 'stellar-revenue-foot', 'No fake guarantees. Start free, test real usefulness, and upgrade only when Stellar saves time or makes the next step clearer.');
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

  // The landing copy and product hierarchy now live in index.html. Keep runtime JS from rewriting it.
  // Legacy business-offer injection remains available for its dedicated pages, but is not mounted on the public home.

  const ref = new URLSearchParams(location.search).get('ref');
  if (ref && /^[A-Za-z0-9_-]{1,100}$/.test(ref)) {
    document.querySelectorAll('a[href^="/app"]').forEach(link => {
      const url = new URL(link.getAttribute('href'), location.origin);
      url.searchParams.set('ref', ref);
      link.href = url.pathname + url.search;
    });
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'ref';
    input.value = ref;
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