// Owner-only Jarvis work orders. Never publish privileged controls before server auth.
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const endpoint = '/api/desktop-agent?surface=jarvis';
  let owner = false, running = false, requestId = '', signature = '', currentId = '';
  const presets = {
    customers: ['customers', 'Research buyer demand for Stellar AI among FiveM and Roblox developers. Identify underserved customer segments, create a truthful offer and draft outreach for review. Do not contact anyone.'],
    upgrades: ['revenue', 'Research how Stellar AI can improve paid sign-ups. Prioritise pricing clarity, buyer objections, activation and a small set of measurable conversion experiments. Propose changes; do not publish them.'],
    websites: ['revenue', 'Research a realistic UK small business website design offer. Give scope, pricing, costs, buyer qualifications, a sales message draft and follow-up plan. Do not send messages.'],
    product: ['products', 'Research one legitimately marketable FiveM or Roblox developer product, compare alternatives, propose a working MVP and ethical sales launch plan. Do not deploy or publish.']
  };
  function token() {
    for (const storage of [sessionStorage, localStorage]) {
      for (const key of ['stellar-store-session-fallback', 'stellar-store']) {
        try {
          const data = JSON.parse(storage.getItem(key) || '{}');
          if (typeof data.session === 'string' && data.session) return data.session;
        } catch {}
      }
    }
    return '';
  }
  function status(text, error = false) {
    const el = $('jw-status');
    if (el) { el.textContent = text; el.dataset.error = String(error); }
  }
  function disable() {
    owner = false;
    $('jw-trigger')?.remove();
    const d = $('jw-dialog');
    if (d) { if (d.open) d.close(); d.remove(); }
  }
  async function api(action, input = {}) {
    if (!token()) { disable(); throw new Error('Sign in again to use private work orders.'); }
    const response = await fetch(endpoint, {
      method: 'POST', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() },
      body: JSON.stringify({ action, ...input })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) disable();
      throw new Error(data.error || 'Could not confirm the request. Check your saved work.');
    }
    return data;
  }
  function showMission(mission) {
    if (!mission || !$('jw-output')) return;
    currentId = mission.id;
    const box = $('jw-output');
    box.replaceChildren();
    const heading = document.createElement('strong');
    heading.textContent = (mission.title || 'Jarvis mission') + ' · ' + mission.status;
    box.append(heading);
    const body = document.createElement('pre');
    body.textContent = mission.summary
      ? String(mission.summary).slice(0, 13000)
      : (mission.steps || []).map(s => s.title + ': ' + s.status).join('\n');
    box.append(body);
    const link = document.createElement('a');
    link.href = '/private-workspace.html';
    link.textContent = 'View saved work and sources ↗';
    box.append(link);
    if (mission.error) {
      const issue = document.createElement('p');
      issue.textContent = 'Needs attention: ' + String(mission.error).slice(0, 400);
      box.append(issue);
    }
    const resumable = mission.status === 'queued'
      || (mission.status === 'running' && mission.canResume === true)
      || (mission.status === 'failed' && (mission.steps || []).every(step => step.status === 'completed' || step.attempts < 3));
    if (resumable) {
      const resume = createButton(mission.status === 'failed' ? 'Retry failed step' : 'Run saved task now', async () => {
        if (!owner || running || currentId !== mission.id) return;
        running = true;
        resume.disabled = true;
        if ($('jw-run')) $('jw-run').disabled = true;
        status('Working on your saved mission…');
        try {
          const result = await api(mission.status === 'failed' ? 'retry' : 'run', { id: mission.id });
          showMission(result.mission);
        } catch (error) {
          status(error.message + ' Your saved progress is still available.', true);
        } finally {
          running = false;
          if ($('jw-run')) $('jw-run').disabled = false;
        }
      });
      box.append(resume);
    }
    if (mission.status === 'completed') status('Completed and saved. No customer contacts, payments or deployments were made.');
    if (mission.status === 'failed' && !resumable) status('This mission reached its retry limit. Review the results before creating another.', true);
    if (mission.status === 'failed' && resumable) status('A step needs attention. You can retry without repeating completed steps.', true);
  }
  async function refresh() {
    if (!owner || running) return;
    try {
      const data = await api('status');
      const latest = (data.missions || []).find(x => x.id === currentId) || data.missions?.[0];
      if (latest) showMission(latest);
      if ($('jw-capabilities')) {
        const lastRun = Number(data.lastWorkerAt) > 0 ? new Date(data.lastWorkerAt).toLocaleString() : 'not recorded';
        $('jw-capabilities').textContent =
          'AI: ' + (data.capabilities?.ai ? 'configured' : 'not configured') +
          ' · Web research: ' + (data.capabilities?.search ? 'configured' : 'not configured') +
          ' · Scheduled queue recovery: ' + (data.schedule === 'daily' ? 'daily (production only)' : 'not configured') +
          ' · Last background check: ' + lastRun +
          ' · Configuration does not prove successful provider requests.';
      }
    } catch (e) { status(e.message, true); }
  }
  async function submit(event) {
    event.preventDefault();
    if (!owner || running) return;
    const objective = $('jw-goal').value.trim();
    if (objective.length < 10 || objective.length > 4000) return status('Enter 10–4,000 characters.', true);
    const kind = $('jw-kind').value;
    const notify = { email: $('jw-email').checked, call: false };
    const inputSignature = JSON.stringify({ objective, kind, notify });
    if (!requestId || signature !== inputSignature) {
      requestId = crypto.randomUUID();
      signature = inputSignature;
    }
    running = true;
    $('jw-run').disabled = true;
    status('Saving a new work order…');
    try {
      const created = await api('create', { objective, kind, notify, requestId });
      currentId = created.mission.id;
      showMission(created.mission);
      requestId = '';
      signature = '';
      $('jw-goal').value = '';
      status('Saved. Running the research and drafting specialists…');
      const result = await api('run', { id: currentId });
      showMission(result.mission);
    } catch (e) {
      status(e.message + ' Review saved missions before another attempt.', true);
    } finally {
      running = false;
      if ($('jw-run')) $('jw-run').disabled = false;
    }
  }
  function createButton(label, fn) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', fn);
    return button;
  }
  function mount() {
    if (owner || !document.querySelector('.composer-row')) return;
    owner = true;
    const style = document.createElement('style');
    style.id = 'jw-style';
    style.textContent = [
      '#jw-trigger{min-height:44px;min-width:58px;border:1px solid #555963;border-radius:10px;background:#24262c;color:white;font-size:12px;font-weight:700}',
      '#jw-dialog{position:fixed;inset:0;margin:auto;width:min(620px,calc(100% - 20px));max-height:88dvh;overflow:auto;padding:21px;background:#111319;border:1px solid #3a3d46;border-radius:17px;color:#f5f5f6;box-shadow:0 28px 100px #000b}',
      '#jw-dialog::backdrop{background:#000c}',
      '#jw-dialog h2{font-size:21px;margin:0}',
      '#jw-dialog p{color:#b9bdc6;line-height:1.5;font-size:13px}',
      '#jw-dialog select,#jw-dialog textarea{display:block;box-sizing:border-box;width:100%;margin:7px 0 14px;padding:11px;border:1px solid #414652;border-radius:10px;color:#fff;background:#20232b;font:inherit}',
      '#jw-dialog textarea{min-height:118px;resize:vertical;line-height:1.5}',
      '#jw-dialog label{font-size:13px;font-weight:650}',
      '#jw-dialog button{min-height:44px;padding:0 13px;background:#252831;color:#fff;border:1px solid #444954;border-radius:10px;cursor:pointer}',
      '#jw-dialog button:disabled{opacity:.5}',
      '#jw-dialog #jw-run{background:#f1f2f4;color:#18191c;font-weight:700}',
      '#jw-dialog .jw-row{display:flex;align-items:center;justify-content:space-between;gap:9px;flex-wrap:wrap}',
      '#jw-dialog .jw-presets,#jw-dialog .jw-links{display:flex;flex-wrap:wrap;gap:7px;margin:13px 0}',
      '#jw-dialog .jw-links a{padding:8px 10px;border:1px solid #454954;border-radius:10px;color:#e7edf9;text-decoration:none;font-size:12px}',
      '#jw-dialog pre{white-space:pre-wrap;overflow:auto;max-height:190px;padding:12px;border-radius:10px;background:#1c2027;font-size:12px}',
      '#jw-output{padding-top:12px;border-top:1px solid #40434a;margin-top:12px;overflow-wrap:anywhere}',
      '#jw-output a{color:#cddaf8}',
      '#jw-status[data-error=true]{color:#ffb6b6!important}',
      '#jw-dialog .jw-small{font-size:12px}',
      '#jw-dialog input[type=checkbox]{width:17px;height:17px;vertical-align:middle}',
      '@media(max-width:550px){#jw-dialog{padding:15px}#jw-trigger{min-width:52px;padding:0 8px}}'
    ].join('\n');
    document.head.append(style);
    const trigger = createButton('Work ↗', () => {
      const prompt = $('prompt')?.value?.trim() || '';
      if (prompt.length >= 10 && !$('jw-goal').value.trim()) $('jw-goal').value = prompt.slice(0, 4000);
      $('jw-dialog').showModal();
      refresh();
      $('jw-goal').focus();
    });
    trigger.id = 'jw-trigger';
    trigger.title = 'Give Jarvis a business work order';
    document.querySelector('.composer-row').prepend(trigger);
    const dialog = document.createElement('dialog');
    dialog.id = 'jw-dialog';
    dialog.setAttribute('aria-labelledby', 'jw-title');
    dialog.innerHTML = [
      '<div class="jw-row"><h2 id="jw-title">Jarvis · Work orders</h2><button type="button" id="jw-close" aria-label="Close">✕</button></div>',
      '<p>Give Jarvis a business objective. It researches opportunities, prepares sales drafts, and saves the results for your review.</p>',
      '<div class="jw-presets" aria-label="Business goals"><button type="button" data-jw-preset="customers">Find customers</button><button type="button" data-jw-preset="upgrades">Improve sign-ups</button><button type="button" data-jw-preset="websites">Sell websites</button><button type="button" data-jw-preset="product">Create product</button></div>',
      '<form id="jw-form"><label for="jw-kind">Work type</label><select id="jw-kind"><option value="revenue">Revenue &amp; Growth</option><option value="customers">Customer research</option><option value="products">Product plan</option><option value="operations">Operations</option><option value="everything">Full business brief</option></select>',
      '<label for="jw-goal">What should Jarvis work on?</label><textarea id="jw-goal" maxlength="4000" minlength="10" required placeholder="Research a real £50 website service offer, prepare a sales draft and list the next steps. Do not contact anyone."></textarea>',
      '<label><input type="checkbox" id="jw-email"> Email the final result to my verified owner inbox</label>',
      '<div class="jw-row"><p class="jw-small">AI provider usage may cost money. You approve each work order.</p><button type="submit" id="jw-run">Start work ↑</button></div></form>',
      '<p id="jw-status" role="status" aria-live="polite">Ready for your instruction.</p><div id="jw-output"></div><p id="jw-capabilities" class="jw-small">Checking configuration…</p>',
      '<div class="jw-links"><a href="/private-workspace.html">Saved missions ↗</a><a href="/email-agent">Email drafts ↗</a><a href="/desktop">Computer tasks ↗</a><a href="/deploy">Deployment review ↗</a></div>',
      '<p class="jw-small">Research and drafts only. Sending to customers, publishing, purchases, or account changes require separate authorised workflows. Income is not guaranteed.</p>'
    ].join('\n');
    document.body.append(dialog);
    $('jw-close').addEventListener('click', () => dialog.close());
    $('jw-form').addEventListener('submit', submit);
    dialog.querySelectorAll('[data-jw-preset]').forEach(button => button.addEventListener('click', () => {
      const entry = presets[button.dataset.jwPreset];
      if (!entry) return;
      $('jw-kind').value = entry[0];
      $('jw-goal').value = entry[1];
      $('jw-goal').focus();
    }));
    setInterval(() => {
      if (owner && dialog.open && currentId && !document.hidden) refresh();
    }, 12000);
  }
  async function verifyOwner() {
    if (!token()) return disable();
    try {
      const response = await fetch('/api/get-plan', { cache: 'no-store', headers: { Authorization: 'Bearer ' + token() } });
      if (!response.ok) return disable();
      const data = await response.json().catch(() => ({}));
      if (data.owner === true || data.accountPlan?.owner === true) mount();
      else disable();
    } catch { disable(); }
  }
  window.addEventListener('storage', event => {
    if (['stellar-store', 'stellar-store-session-fallback'].includes(event.key)) verifyOwner();
  });
  window.addEventListener('pageshow', verifyOwner);
  verifyOwner();
})();