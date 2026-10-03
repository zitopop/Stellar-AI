const $ = id => document.getElementById(id);
let missions = [], selectedId = '', kind = 'everything', authorized = false, busy = false, refreshing = false;
let pendingCreate = null;
const runningIds = new Set();
function token() { try { return JSON.parse(localStorage.getItem('stellar-store') || '{}').session || ''; } catch { return ''; } }
function feedback(message, type = '') { $('feedback').textContent = message; $('feedback').className = `feedback ${type}`; }
function node(tag, className, text) { const el = document.createElement(tag); if (className) el.className = className; if (text != null) el.textContent = text; return el; }
function signInRequired(message) { authorized = false; $('mission-fields').disabled = true; $('access-panel').hidden = false; $('access-message').textContent = message; missions = []; selectedId = ''; render(); }
async function api(action, values = {}) {
  let response;
  try { response = await fetch('/api/desktop-agent?surface=jarvis', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify({ action, ...values }) }); }
  catch { throw new Error('The connection was interrupted. Refresh to check saved progress before trying again.'); }
  const data = await response.json().catch(() => ({}));
  if ([401, 403].includes(response.status)) signInRequired(data.error || 'Sign in with your owner account to continue.');
  if (!response.ok) throw new Error(data.error || 'The request could not be confirmed. Refresh to check your saved work.');
  return data;
}
function upsert(mission) { const index = missions.findIndex(m => m.id === mission.id); if (index < 0) missions.unshift(mission); else missions[index] = mission; }
function badge(status) { return node('span', `badge ${status}`, status); }
function resultText(mission) { return `${mission.title}\n\n${mission.objective}\n\n${mission.steps.map(step => `${step.title} (${step.status})\n${step.result || step.error || 'No completed result yet.'}\n${(step.sources || []).map(source => `${source.title}: ${source.url}`).join('\n')}`).join('\n\n')}`; }
function actionButton(label, action) { const b = node('button', 'button secondary', label); b.type = 'button'; b.addEventListener('click', action); return b; }
function render() {
  const list = $('mission-list'); list.replaceChildren();
  if (!missions.length) {
    const empty = node('div', 'empty-state'); empty.append(node('span', '', '◇'), node('h3', '', 'A clear place to start.'), node('p', '', authorized ? 'Start your first mission above. Every completed step will be saved here.' : 'Your private missions appear after owner sign-in.')); list.append(empty);
  }
  for (const mission of missions) {
    const card = node('button', 'mission-card'); card.type = 'button'; card.setAttribute('aria-pressed', String(mission.id === selectedId));
    card.append(badge(mission.status), node('h3', '', mission.title), node('small', '', `${mission.steps.filter(s => s.status === 'completed').length} / ${mission.steps.length} steps · ${new Date(mission.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`));
    card.addEventListener('click', () => { selectedId = mission.id; render(); }); list.append(card);
  }
  const detail = $('mission-detail');
  const mission = missions.find(m => m.id === selectedId);
  if (!mission) { detail.replaceChildren(); const empty = node('div', 'detail-empty'); empty.append(node('span', 'outline-orb', '✦'), node('h3', '', 'One step at a time.'), node('p', '', 'Choose a mission to see each specialist’s progress, sources and results.')); detail.append(empty); return; }
  const openSteps = new Set([...detail.querySelectorAll('details[open]')].map(el => el.dataset.step));
  detail.replaceChildren(badge(mission.status), node('h2', '', mission.title), node('p', 'objective', mission.objective));
  const actions = node('div', 'task-actions');
  if (mission.status === 'queued' || mission.canResume || mission.status === 'failed') {
    const run = actionButton(mission.status === 'failed' ? 'Retry unfinished work' : mission.canResume ? 'Resume mission' : 'Run mission', () => runMission(mission.id, mission.status === 'failed' ? 'retry' : 'run'));
    run.disabled = runningIds.has(mission.id); actions.append(run);
  }
  if (['queued', 'running'].includes(mission.status)) actions.append(actionButton('Cancel remaining work', async () => {
    try { const data = await api('cancel', { id: mission.id }); upsert(data.mission); render(); feedback(data.mission.cancellationRequested ? 'Cancellation requested. The current step may finish; subsequent steps will stop.' : 'Mission cancelled. Completed results are still saved.'); } catch (e) { feedback(e.message, 'error'); }
  }));
  if (mission.steps.some(s => s.result)) {
    actions.append(actionButton('Copy results', async () => { try { await navigator.clipboard.writeText(resultText(mission)); feedback('Results copied.', 'success'); } catch { feedback('Clipboard access is unavailable. Use Download instead.', 'error'); } }));
    actions.append(actionButton('Download', () => { const url = URL.createObjectURL(new Blob([resultText(mission)], { type: 'text/plain;charset=utf-8' })); const link = node('a'); link.href = url; link.download = 'jarvis-mission.txt'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }));
  }
  detail.append(actions);
  for (const step of mission.steps) {
    const section = node('details', 'step'); section.dataset.step = step.id; section.open = openSteps.has(step.id) || step.status === 'running' || step.status === 'failed' || step.role === 'reviewer' && !!step.result;
    const summary = node('summary', '', step.title); summary.append(badge(step.status)); section.append(summary);
    if (step.error) section.append(node('p', 'error', step.error));
    if (step.result) section.append(node('pre', '', step.result));
    if (step.sources?.length) { const sources = node('ul'); for (const source of step.sources) { try { const url = new URL(source.url); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) continue; const li = node('li'); const link = node('a', '', source.title || url.hostname); link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; li.append(link); sources.append(li); } catch { /* Invalid provider URLs are never clickable. */ } } section.append(sources); }
    detail.append(section);
  }
  for (const [channel, value] of Object.entries(mission.notifications || {})) detail.append(node('p', 'delivery', `${channel === 'email' ? 'Email' : 'Phone'} update · ${value.message}`));
}
async function refresh({ quiet = false } = {}) {
  if (refreshing) return; refreshing = true;
  try {
    if (!token()) { signInRequired('Sign in with your owner account to see your missions.'); feedback('A private workspace for your business.'); return; }
    const data = await api('status'); authorized = true; $('access-panel').hidden = true; $('mission-fields').disabled = busy;
    missions = data.missions || []; if (!missions.some(m => m.id === selectedId)) selectedId = missions[0]?.id || ''; render();
    $('capabilities').replaceChildren();
    for (const [key, label] of [['ai', 'AI specialists'], ['search', 'Web research'], ['email', 'Owner email'], ['phoneConfigured', 'Owner calls']]) {
      const configured = data.capabilities?.[key] === true; const card = node('div', `capability ${configured ? 'configured' : ''}`); card.append(node('strong', '', label), node('span', '', configured ? 'Configured · not verified' : 'Not configured')); $('capabilities').append(card);
    }
    $('schedule-note').textContent = data.schedule === 'daily' ? `Queued work has a daily recovery check (one mission per check). Run now for immediate work. ${data.lastWorkerAt ? `Last worker check: ${new Date(data.lastWorkerAt).toLocaleString()}.` : 'No scheduled run has been verified yet.'} Results are retained for 30 days.` : 'Run missions here to start immediately. Background recovery is not configured. Results are retained for 30 days.';
    if (!quiet) feedback(missions.length ? 'Your saved workspace is up to date.' : 'Ready for your first mission.');
  } catch (e) { if (!quiet) feedback(e.message, 'error'); }
  finally { refreshing = false; }
}
async function runMission(id, action = 'run') {
  if (runningIds.has(id)) return;
  runningIds.add(id); feedback('Jarvis is working. Each completed specialist result is saved as it arrives.');
  try { const data = await api(action, { id }); if (authorized) { upsert(data.mission); render(); feedback(data.mission.status === 'completed' ? 'Your results are ready. Open the owner brief below.' : data.mission.status === 'failed' ? 'One step needs attention. Earlier results are saved.' : `Mission ${data.mission.status}.`, data.mission.status === 'failed' ? 'error' : 'success'); } }
  catch (e) { feedback(e.message, 'error'); await refresh({ quiet: true }); }
  finally { runningIds.delete(id); render(); }
}
document.querySelectorAll('[data-kind]').forEach(button => button.addEventListener('click', () => { kind = button.dataset.kind; pendingCreate = null; document.querySelectorAll('[data-kind]').forEach(item => item.setAttribute('aria-pressed', String(item === button))); }));
$('mission-form').addEventListener('submit', async event => {
  event.preventDefault(); if (!authorized || busy) return;
  const objective = $('mission-objective').value.trim(); if (objective.length < 10) return;
  const input = { objective, kind, notify: { email: $('notify-email').checked, call: $('notify-call').checked } };
  const signature = JSON.stringify(input);
  if (!pendingCreate || pendingCreate.signature !== signature) pendingCreate = { signature, requestId: crypto.randomUUID() };
  busy = true; $('mission-fields').disabled = true; feedback('Saving your mission…');
  try { const data = await api('create', { ...input, requestId: pendingCreate.requestId }); pendingCreate = null; selectedId = data.mission.id; upsert(data.mission); render(); $('mission-objective').value = ''; await runMission(data.mission.id); }
  catch (e) { feedback(e.message, 'error'); }
  finally { busy = false; $('mission-fields').disabled = !authorized; }
});
$('refresh-missions').addEventListener('click', () => refresh());
window.addEventListener('storage', event => { if (event.key === 'stellar-store') refresh(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh({ quiet: true }); });
setInterval(() => { if (authorized && !document.hidden && missions.some(m => ['queued', 'running'].includes(m.status))) refresh({ quiet: true }); }, 6000);
refresh();
