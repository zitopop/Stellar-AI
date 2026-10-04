(() => {
  const target = document.querySelector('[data-purchase-status]');
  if (!target) return;

  const params = new URLSearchParams(location.search);
  const sessionId = String(params.get('session_id') || '').trim();
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return;

  target.hidden = false;
  target.setAttribute('aria-live', 'polite');

  const title = document.createElement('strong');
  const message = document.createElement('span');
  title.textContent = 'Confirming your purchase…';
  message.textContent = 'Checking Stripe and Stellar provisioning.';
  target.replaceChildren(title, message);

  const render = (data) => {
    title.textContent = String(data?.title || (data?.payment === 'paid' ? 'Payment confirmed' : 'Checking payment'));
    message.textContent = String(data?.message || 'Your order is being processed.');
    target.dataset.state = data?.ready ? 'ready' : data?.actionRequired ? 'action' : data?.payment === 'paid' ? 'processing' : 'pending';
  };

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  (async () => {
    let terminal = false;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        const response = await fetch('/api/purchase-status?session_id=' + encodeURIComponent(sessionId), {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Could not verify purchase status.');
        render(data);
        terminal = data.ready === true
          || data.actionRequired === true
          || ['expired', 'needs_owner_review', 'delivered', 'live'].includes(String(data.status || ''));
        if (terminal) break;
      } catch (error) {
        title.textContent = 'Your Stripe receipt is your payment confirmation';
        message.textContent = 'Stellar could not refresh the live fulfilment status right now. Your order record is preserved and automatic processing continues.';
        target.dataset.state = 'pending';
        break;
      }
      await sleep(1500);
    }

    if (!terminal && target.dataset.state === 'processing') {
      message.textContent += ' You do not need to pay again.';
    }

    params.delete('session_id');
    history.replaceState(null, '', location.pathname + (params.toString() ? '?' + params.toString() : '') + location.hash);
  })();
})();
