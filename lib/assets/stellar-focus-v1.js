/* Optional client-side refinement. It only drafts a follow-up; it never spends credits on click. */
(() => {
  'use strict';
  function init() {
    const messages = document.getElementById('chatInner');
    const prompt = document.getElementById('prompt');
    if (!messages || !prompt || messages.dataset.stellarFocusReady === '1') return;
    messages.dataset.stellarFocusReady = '1';

    function enhanceActions() {
      messages.querySelectorAll('.msg.assistant .message-actions').forEach((actions) => {
        if (actions.querySelector('[data-message-action="improve-draft"]')) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'message-action';
        button.dataset.messageAction = 'improve-draft';
        button.textContent = 'Improve';
        button.title = 'Draft a request to improve this answer';
        button.setAttribute('aria-label', 'Improve this answer');
        const regenerate = actions.querySelector('[data-message-action="regenerate"]');
        actions.insertBefore(button, regenerate || null);
      });
    }

    const observer = new MutationObserver(enhanceActions);
    observer.observe(messages, { childList: true, subtree: true });
    enhanceActions();

    messages.addEventListener('click', (event) => {
      const button = event.target.closest('[data-message-action="improve-draft"]');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      const article = button.closest('.msg.assistant');
      const answer = article?.querySelector('.bubble')?.textContent?.trim();
      if (!answer) return;
      if (prompt.value.trim() && !window.confirm('Replace your unsent draft with an improvement request?')) return;
      const prefix = 'Improve this answer. Make it clearer, more accurate and more useful. Keep what is correct, explain uncertainties, and give practical next steps.\n\nAnswer to improve:\n';
      prompt.value = (prefix + answer.slice(0, 6400)).slice(0, 7800);
      prompt.dispatchEvent(new Event('input', { bubbles: true }));
      prompt.focus();
      prompt.setSelectionRange(prompt.value.length, prompt.value.length);
      const status = document.getElementById('status');
      if (status) {
        status.textContent = 'Review your improvement request, then send';
        status.className = 'status good composer-status';
      }
    }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
