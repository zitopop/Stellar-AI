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
    window.StellarTelemetry?.track?.('app-open-cta');
  });
  prompt?.addEventListener('input', () => prompt.setCustomValidity(''));
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
