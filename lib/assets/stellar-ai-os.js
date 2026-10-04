const $ = id => document.getElementById(id);

let authorized = false;
let missions = [];
let agents = [];
let capabilities = {};
let selectedId = '';
let busy = false;
let refreshing = false;
let pendingCreate = null;

const fallbackAgents = [
  { id: 'executive_assistant', title: 'Executive Assistant' },
  { id: 'research', title: 'Research & Intelligence' },
  { id: 'revenue', title: 'Revenue & Growth' },
  { id: 'engineering', title: 'Engineering' },
  { id: 'operations', title: 'Operations' },
  { id: 'chief_of_staff', title: 'AI Brain · Chief of Staff' },
];

const descriptions = {
  executive_assistant: 'Frames the objective, priorities, constraints, dependencies and decisions.',
  research: 'Finds evidence, context, uncertainty, risks and facts the team can rely on.',
  revenue: 'Looks for credible offers, conversion improvements and revenue opportunities.',
  engineering: 'Turns the plan into the smallest safe technical implementation path.',
  operations: 'Orders the work, catches blockers and turns the plan into an executable checklist.',
  chief_of_staff: 'Reconciles every agent, removes unsupported claims and produces the final owner brief.',
};

function token() {
  try { return String(JSON.parse(localStorage.getItem('stellar-store') || '{}')?.session || ''); }
  catch { return ''; }
}

function feedback(message, type = '') {
  const el = $('feedback');
  if (!el) return;
  el.textContent = message;
  el.className = 'feedback' + (type ? ' ' + type : '');
}

function node(tag, className = '', text = '') {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== '') el.textContent = text;
  return el;
}

function badge(status = 'queued') {
  return node('span', 'badge ' + status, status);
}

function showLocked(message) {
  authorized = false;
  $('os').hidden = true;
  $('access').hidden = false;
  $('access-message').textContent = message || 'Sign in with your private Stellar account to continue.';
}

function showOS() {
  authorized = true;
  $('access').hidden = true;
  $('os').hidden = false;
  $('command-fields').disabled = busy;
}

async function api(action, values = {}) {
  if (!token()) throw Object.assign(new Error('Sign in with your private Stellar account to continue.'), { auth: true });
  let response;
  try {
    response = await fetch('/api/desktop-agent?surface=jarvis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() },
      body: JSON.stringify({ action, ...values }),
      cache: 'no-store',
    });
  } catch {
    throw new Error('The AI OS connection was interrupted. Refresh and try again.');
  }
  const data = await response.json().catch(() => ({}));
  if ([401, 403].includes(response.status)) {
    const error = Object.assign(new Error(data.error || 'Private AI OS access is required.'), { auth: true });
    throw error;
  }
  if (!response.ok) throw new Error(data.error || 'The AI OS request could not be confirmed.');
  return data;
}

function agentMission() {
  return missions.find(m => m.kind === 'ai_os' && ['running', 'queued', 'failed'].includes(m.status))
    || missions.find(m => m.id === selectedId && m.kind === 'ai_os')
    || missions.find(m => m.kind === 'ai_os')
    || null;
}

function renderMetrics() {
  $('metric-active').textContent = String(missions.filter(m => ['running', 'queued'].includes(m.status)).length);
  $('metric-blocked').textContent = String(missions.filter(m => m.status === 'failed').length);
  $('metric-done').textContent = String(missions.filter(m => m.status === 'completed').length);
  $('metric-agents').textContent = String((agents.length || fallbackAgents.length));

  const current = agentMission();
  const state = current?.status === 'failed' ? 'BLOCKED'
    : current?.status === 'running' ? 'WORKING'
      : current?.status === 'queued' ? 'QUEUED'
        : 'READY';
  $('brain-state').textContent = state;
  $('system-status').textContent = state === 'READY' ? 'AI OS ready' : 'AI OS · ' + state.toLowerCase();
}

function stepState(role) {
  const current = agentMission();
  const step = current?.steps?.find(item => item.role === role);
  return step?.status || 'idle';
}

function renderAgents() {
  const grid = $('agents');
  grid.replaceChildren();
  for (const [index, agent] of (agents.length ? agents : fallbackAgents).entries()) {
    const state = stepState(agent.id);
    const card = node('article', 'agent-card ' + state);
    const top = node('div', 'agent-top');
    top.append(node('span', 'agent-id', 'AGENT ' + String(index + 1).padStart(2, '0')), node('span', 'agent-status', state));
    card.append(top, node('h3', '', agent.title), node('p', '', descriptions[agent.id] || 'Specialist agent coordinated by the Stellar AI Brain.'));
    grid.append(card);
  }
}

function missionResultText(mission) {
  return [
    mission.title,
    mission.objective,
    ...(mission.steps || []).map(step => [
      step.title + ' (' + step.status + ')',
      step.result || step.error || 'No completed result yet.',
      ...(step.sources || []).map(source => (source.title || 'Source') + ': ' + source.url),
    ].join('\n')),
  ].join('\n\n');
}

function selectMission(id) {
  selectedId = id;
  renderMissions();
  renderDetail();
}

function renderMissions() {
  const list = $('mission-list');
  list.replaceChildren();
  const ordered = [...missions].sort((a, b) => {
    if (a.kind === 'ai_os' && b.kind !== 'ai_os') return -1;
    if (a.kind !== 'ai_os' && b.kind === 'ai_os') return 1;
    return Number(b.createdAt || 0) - Number(a.createdAt || 0);
  });
  if (!ordered.length) {
    const empty = node('div', 'approval-empty');
    empty.append(node('strong', '', 'No missions yet'), node('p', '', 'Run the AI Brain above and the team will save each specialist result here.'));
    list.append(empty);
    return;
  }
  for (const mission of ordered) {
    const card = node('button', 'mission-card');
    card.type = 'button';
    card.setAttribute('aria-pressed', String(mission.id === selectedId));
    const row = node('div', 'row');
    row.append(badge(mission.status), node('small', '', mission.kind === 'ai_os' ? 'AI OS' : 'Jarvis'));
    const completed = (mission.steps || []).filter(s => s.status === 'completed').length;
    card.append(row, node('h3', '', mission.title), node('small', '', completed + ' / ' + (mission.steps?.length || 0) + ' agents · ' + new Date(mission.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })));
    card.addEventListener('click', () => selectMission(mission.id));
    list.append(card);
  }
}

function validSourceUrl(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    return url;
  } catch { return null; }
}

function actionButton(label, fn) {
  const button = node('button', '', label);
  button.type = 'button';
  button.addEventListener('click', fn);
  return button;
}

function renderDetail() {
  const detail = $('mission-detail');
  const mission = missions.find(m => m.id === selectedId);
  detail.replaceChildren();

  if (!mission) {
    const empty = node('div', 'empty-detail');
    empty.append(node('span', '', '✦'), node('h3', '', 'Select a mission'), node('p', '', 'The Brain brief and every agent result will appear here.'));
    detail.append(empty);
    return;
  }

  detail.append(badge(mission.status), node('h2', 'detail-title', mission.title), node('p', 'detail-objective', mission.objective));
  const actions = node('div', 'detail-actions');

  if (mission.status === 'queued' || mission.canResume || mission.status === 'failed') {
    const label = mission.status === 'failed' ? 'Retry unfinished agents' : mission.canResume ? 'Resume mission' : 'Run mission';
    actions.append(actionButton(label, () => runMission(mission.id, mission.status === 'failed' ? 'retry' : 'run')));
  }
  if (['queued', 'running'].includes(mission.status)) {
    actions.append(actionButton('Cancel remaining work', () => cancelMission(mission.id)));
  }
  if ((mission.steps || []).some(step => step.result)) {
    actions.append(actionButton('Copy full brief', async () => {
      try { await navigator.clipboard.writeText(missionResultText(mission)); feedback('Mission brief copied.', 'success'); }
      catch { feedback('Clipboard access is unavailable.', 'error'); }
    }));
  }
  if (actions.children.length) detail.append(actions);

  for (const step of mission.steps || []) {
    const section = node('details', 'step');
    section.open = step.status === 'running' || step.status === 'failed' || step.role === 'chief_of_staff';
    const summary = node('summary');
    summary.append(node('span', '', step.title), badge(step.status));
    section.append(summary);
    if (step.error) section.append(node('p', 'error', step.error));
    if (step.result) section.append(node('pre', '', step.result));
    if (step.sources?.length) {
      const sources = node('ul');
      for (const source of step.sources) {
        const url = validSourceUrl(source.url);
        if (!url) continue;
        const li = node('li');
        const link = node('a', '', source.title || url.hostname);
        link.href = url.href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        li.append(link);
        sources.append(li);
      }
      if (sources.children.length) section.append(sources);
    }
    detail.append(section);
  }
}

function renderApprovals() {
  const root = $('approvals');
  root.replaceChildren();
  const blocked = missions.filter(m => m.status === 'failed');
  if (!blocked.length) {
    const empty = node('div', 'approval-empty');
    empty.append(node('strong', '', 'No owner decision is waiting'), node('p', '', 'When an agent hits a blocker, it will stop safely and surface the reason here instead of pretending the work finished.'));
    root.append(empty);
    return;
  }
  for (const mission of blocked.slice(0, 8)) {
    const failed = mission.steps?.find(step => step.status === 'failed');
    const item = node('button', 'approval-item');
    item.type = 'button';
    item.append(node('strong', '', mission.title), node('p', '', (failed?.title ? failed.title + ': ' : '') + (failed?.error || mission.error || 'This mission needs attention.')));
    item.addEventListener('click', () => selectMission(mission.id));
    root.append(item);
  }
}

function renderCapabilities() {
  const root = $('capabilities');
  root.replaceChildren();
  const items = [
    ['ai', 'AI generation'],
    ['search', 'Web intelligence'],
    ['email', 'Owner email'],
    ['phoneConfigured', 'Owner calls'],
  ];
  let ready = 0;
  for (const [key, label] of items) {
    const ok = capabilities?.[key] === true;
    if (ok) ready += 1;
    const card = node('div', 'capability' + (ok ? ' ok' : ''));
    card.append(node('strong', '', label), node('span', '', ok ? 'Configured' : 'Not configured'));
    root.append(card);
  }
  $('capability-summary').textContent = ready + ' / ' + items.length + ' systems configured';
}

function renderAll() {
  renderMetrics();
  renderAgents();
  renderMissions();
  renderDetail();
  renderApprovals();
  renderCapabilities();
}

async function refresh({ quiet = false } = {}) {
  if (refreshing) return;
  refreshing = true;
  try {
    if (!token()) {
      showLocked('Sign in with your private Stellar account to open AI OS.');
      return;
    }
    const data = await api('status');
    showOS();
    missions = Array.isArray(data.missions) ? data.missions : [];
    agents = Array.isArray(data.agents) ? data.agents : fallbackAgents;
    capabilities = data.capabilities || {};
    if (!missions.some(m => m.id === selectedId)) selectedId = missions.find(m => m.kind === 'ai_os')?.id || missions[0]?.id || '';
    renderAll();
    if (!quiet) feedback('AI OS is ready.', 'success');
  } catch (error) {
    if (error.auth) showLocked(error.message);
    else if (!quiet) feedback(error.message, 'error');
  } finally {
    refreshing = false;
  }
}

async function runMission(id, action = 'run') {
  if (busy) return;
  busy = true;
  $('command-fields').disabled = true;
  feedback('AI Brain is coordinating the team…');
  try {
    const data = await api(action, { id });
    const index = missions.findIndex(m => m.id === data.mission.id);
    if (index >= 0) missions[index] = data.mission; else missions.unshift(data.mission);
    selectedId = data.mission.id;
    renderAll();
    feedback(data.mission.status === 'completed' ? 'Executive brief ready.' : data.mission.status === 'failed' ? 'The team stopped on a blocker that needs attention.' : 'Mission updated.', data.mission.status === 'failed' ? 'error' : 'success');
  } catch (error) {
    if (error.auth) showLocked(error.message);
    else feedback(error.message, 'error');
    await refresh({ quiet: true });
  } finally {
    busy = false;
    if (authorized) $('command-fields').disabled = false;
  }
}

async function cancelMission(id) {
  try {
    const data = await api('cancel', { id });
    const index = missions.findIndex(m => m.id === data.mission.id);
    if (index >= 0) missions[index] = data.mission;
    renderAll();
    feedback(data.mission.cancellationRequested ? 'Cancellation requested. The current agent may finish; later agents will stop.' : 'Mission cancelled.');
  } catch (error) {
    feedback(error.message, 'error');
  }
}

$('command-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!authorized || busy) return;
  const objective = $('command-input').value.trim();
  if (objective.length < 10) {
    feedback('Give the AI team a little more detail first.', 'error');
    return;
  }
  const payload = {
    objective,
    kind: 'ai_os',
    notify: { email: $('notify-email').checked, call: $('notify-call').checked },
  };
  const signature = JSON.stringify(payload);
  if (!pendingCreate || pendingCreate.signature !== signature) {
    pendingCreate = { signature, requestId: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2) };
  }

  busy = true;
  $('command-fields').disabled = true;
  feedback('Saving the executive objective…');
  try {
    const data = await api('create', { ...payload, requestId: pendingCreate.requestId });
    pendingCreate = null;
    missions.unshift(data.mission);
    selectedId = data.mission.id;
    $('command-input').value = '';
    renderAll();
  } catch (error) {
    busy = false;
    if (authorized) $('command-fields').disabled = false;
    feedback(error.message, 'error');
    return;
  }
  busy = false;
  if (authorized) $('command-fields').disabled = false;
  await runMission(selectedId, 'run');
});

document.querySelectorAll('[data-prompt]').forEach(button => button.addEventListener('click', () => {
  $('command-input').value = button.dataset.prompt || '';
  $('command-input').focus();
}));

$('refresh').addEventListener('click', () => refresh());
window.addEventListener('storage', event => { if (event.key === 'stellar-store') refresh(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh({ quiet: true }); });
setInterval(() => {
  if (authorized && !document.hidden && missions.some(m => ['queued', 'running'].includes(m.status))) refresh({ quiet: true });
}, 6000);

refresh();
