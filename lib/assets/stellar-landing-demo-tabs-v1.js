(() => {
  'use strict';

  const tabs = [...document.querySelectorAll('[data-example-tab]')];
  const panel = document.getElementById('stellar-example-panel');
  const prompt = document.getElementById('stellar-example-prompt');
  const title = document.getElementById('stellar-example-result-title');
  const result = document.getElementById('stellar-example-result-description');
  const highlights = document.getElementById('stellar-example-highlights');
  const tryLink = document.getElementById('stellar-example-try');
  if (!tabs.length || !panel || !prompt || !title || !result || !highlights || !tryLink) return;

  // Clearly labelled illustrative outputs: these are not represented as live model responses.
  const examples = {
    writing: {
      prompt: 'Turn my meeting notes into a client follow-up email. We met Tuesday, the proposal is due Friday, and I need the final requirements.',
      title: 'Subject: Next steps after Tuesday’s meeting',
      result: 'Thanks for meeting on Tuesday. I’ll send the proposal by Friday. Could you share the final requirements so I can tailor it to your priorities?',
      highlights: ['Clear subject', 'Specific deadline', 'Next action included'],
      task: 'Turn these notes into a polite client follow-up email: we met on Tuesday, I will send the proposal on Friday, and I need the final requirements. Write a clear subject and a short, professional email.'
    },
    planning: {
      prompt: 'Help me plan a small website launch in seven days.',
      title: 'A practical seven-day launch plan',
      result: 'Day 1: agree the goal and essential pages. Days 2–4: build and review. Day 5: test on mobile and check forms. Days 6–7: fix issues, publish and verify the live site.',
      highlights: ['Clear milestones', 'Test before launch', 'Next steps mapped'],
      task: 'Help me create a realistic seven-day website launch plan. Ask about my goal and the pages I need. Include build, mobile checks, forms, accessibility, launch and post-launch verification.'
    },
    coding: {
      prompt: 'My JavaScript contact form submits twice when I press Send. Help me debug it.',
      title: 'Start with the likely causes',
      result: 'Check whether both a form submit listener and a button click listener send the request. Look for listeners attached more than once, then test that one submit produces only one request.',
      highlights: ['Likely cause', 'Small checks first', 'Verify the fix'],
      task: 'Help me debug a JavaScript contact form that submits twice. Ask for the form HTML, submit listener code and network behaviour. Find the root cause, propose a minimal fix and explain how to test it.'
    }
  };

  function activate(key, focusTab = false) {
    const example = examples[key];
    const activeTab = tabs.find(tab => tab.dataset.exampleTab === key);
    if (!example || !activeTab) return;
    tabs.forEach(tab => {
      const selected = tab === activeTab;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', activeTab.id);
    prompt.textContent = example.prompt;
    title.textContent = example.title;
    result.textContent = example.result;
    highlights.replaceChildren(...example.highlights.map(label => {
      const chip = document.createElement('span');
      chip.textContent = label;
      return chip;
    }));
    const query = new URLSearchParams({
      prompt: example.task,
      utm_source: 'homepage',
      utm_campaign: 'hero-demo-' + key
    });
    tryLink.href = '/app?' + query.toString();
    if (focusTab) activeTab.focus();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab.dataset.exampleTab));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const indexToOpen = event.key === 'Home' ? 0 :
        event.key === 'End' ? tabs.length - 1 :
        (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      activate(tabs[indexToOpen].dataset.exampleTab, true);
    });
  });
  activate('writing');
})();
