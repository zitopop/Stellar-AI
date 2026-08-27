import crypto from 'crypto';

const DAY_MS = 24 * 60 * 60 * 1000;
const RETURN_SESSION_GAP_MS = 30 * 60 * 1000;
const MAX_COHORT_DAYS = 8;
const RECENT_SIGNUP_WINDOW_DAYS = 30;

function normaliseEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function funnelIdentity(email) {
  return crypto.createHash('sha256').update(normaliseEmail(email)).digest('hex');
}

export function funnelDay(value = Date.now()) {
  return new Date(value).toISOString().slice(0, 10);
}

function dayDifference(from, to) {
  const start = Date.parse(`${funnelDay(from)}T00:00:00.000Z`);
  const end = Date.parse(`${funnelDay(to)}T00:00:00.000Z`);
  return Math.round((end - start) / DAY_MS);
}

function cohortKey(event, day) {
  return `stellar:funnel:${event}:${day}`;
}

async function pipeline(url, token, commands) {
  if (!url || !token || !commands.length) return [];
  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!response.ok) throw new Error('Funnel metrics storage request failed.');
  return response.json();
}

export function initialFunnelState(createdAt = Date.now()) {
  const signupAt = Number(createdAt) || Date.now();
  return {
    instrumentedAt: Date.now(),
    signupAt,
    signupDay: funnelDay(signupAt),
    firstGenerationAt: 0,
    lastSuccessfulGenerationAt: 0,
    secondSessionAt: 0,
  };
}

export async function recordFunnelSignup({ url, token, email, createdAt = Date.now() }) {
  const id = funnelIdentity(email);
  if (!id) return false;
  const day = funnelDay(createdAt);
  try {
    await pipeline(url, token, [
      ['SADD', cohortKey('signup', day), id],
      ['SADD', 'stellar:funnel:tracked-identities', id],
    ]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the profile-safe funnel state and aggregate commands for a completed
 * generation. Existing accounts become marked as legacy observers so we never
 * invent an activation timestamp for activity that happened before this system.
 */
export function applySuccessfulGenerationFunnel({ email, user, now = Date.now() }) {
  const prior = user?.funnel && typeof user.funnel === 'object' ? user.funnel : null;
  if (!prior?.instrumentedAt || prior.legacy) {
    return {
      funnel: {
        instrumentedAt: now,
        legacy: true,
        lastSuccessfulGenerationAt: now,
        observedAt: now,
      },
      commands: [],
      tracked: false,
    };
  }

  const id = funnelIdentity(email);
  const signupAt = Number(prior.signupAt) || Number(user?.createdAt) || now;
  const signupDay = typeof prior.signupDay === 'string' ? prior.signupDay : funnelDay(signupAt);
  const priorLast = Number(prior.lastSuccessfulGenerationAt) || 0;
  const priorFirst = Number(prior.firstGenerationAt) || 0;
  const next = { ...prior, signupAt, signupDay, lastSuccessfulGenerationAt: now };
  const commands = [['SADD', cohortKey('active', funnelDay(now)), id]];

  if (!priorFirst) {
    next.firstGenerationAt = now;
    if (now - signupAt <= DAY_MS) commands.push(['SADD', cohortKey('activated-within-24h', signupDay), id]);
  }

  const daysSinceSignup = dayDifference(signupAt, now);
  if (daysSinceSignup === 1) commands.push(['SADD', cohortKey('retained-d1', signupDay), id]);
  if (daysSinceSignup === 7) commands.push(['SADD', cohortKey('retained-d7', signupDay), id]);
  if (priorLast && now - priorLast >= RETURN_SESSION_GAP_MS && !Number(prior.secondSessionAt) && now - signupAt <= (7 * DAY_MS)) {
    next.secondSessionAt = now;
    commands.push(['SADD', cohortKey('second-session-within-7d', signupDay), id]);
  }

  return { funnel: next, commands, tracked: true };
}

function resultNumber(value) {
  return Math.max(0, Number(value?.result) || 0);
}

function average(values) {
  if (!values.length) return 0;
  return Number((values.reduce((total, value) => total + value, 0) / values.length).toFixed(1));
}

function minutes(milliseconds) {
  return Number((Math.max(0, milliseconds) / 60000).toFixed(1));
}

export function summarizeTodayActivation(profiles, now = Date.now()) {
  const today = funnelDay(now);
  const cohort = (Array.isArray(profiles) ? profiles : []).filter((profile) => {
    const signupDay = typeof profile?.funnel?.signupDay === 'string'
      ? profile.funnel.signupDay
      : funnelDay(Number(profile?.createdAt) || 0);
    return signupDay === today;
  });
  const activated = cohort.filter((profile) => {
    const firstGenerationAt = Number(profile?.funnel?.firstGenerationAt) || 0;
    return firstGenerationAt > 0 && funnelDay(firstGenerationAt) === today;
  });
  return {
    date: today,
    signups: cohort.length,
    firstGenerations: activated.length,
    rate: cohort.length ? Number((activated.length / cohort.length * 100).toFixed(1)) : null,
  };
}

export function summarizeRecentUsage(profiles, now = Date.now()) {
  const windowStart = now - (RECENT_SIGNUP_WINDOW_DAYS * DAY_MS);
  const recent = (Array.isArray(profiles) ? profiles : []).filter((profile) => {
    const createdAt = Number(profile?.createdAt) || 0;
    return createdAt >= windowStart && createdAt <= now;
  });
  const usageRecords = recent.map((profile) => {
    const usage = profile?.usage && typeof profile.usage === 'object' ? profile.usage : {};
    const firstRequestAt = Number(usage.firstRequestAt) || 0;
    const lastRequestAt = Number(usage.lastRequestAt) || 0;
    const currentSessionStartedAt = Number(usage.currentSessionStartedAt) || 0;
    const firstGenerationAt = Number(profile?.funnel?.firstGenerationAt) || 0;
    const createdAt = Number(profile?.createdAt) || now;
    const currentSessionSpan = currentSessionStartedAt && lastRequestAt
      ? Math.max(0, lastRequestAt - currentSessionStartedAt)
      : 0;
    const closedSessionDurationMs = Math.max(0, Number(usage.closedSessionDurationMs) || 0);
    const observedSpan = closedSessionDurationMs + currentSessionSpan;
    const longestSessionMs = Math.max(Math.max(0, Number(usage.longestClosedSessionMs) || 0), currentSessionSpan);
    return {
      acceptedRequests: Math.max(0, Number(usage.acceptedRequests) || 0),
      firstRequestDelay: firstRequestAt ? Math.max(0, firstRequestAt - createdAt) : null,
      firstGenerationDelay: firstGenerationAt ? Math.max(0, firstGenerationAt - createdAt) : null,
      secondSession: Boolean(profile?.funnel?.secondSessionAt),
      sessionCount: Math.max(0, Number(usage.sessionCount) || 0),
      observedSpan,
      longestSessionMs,
    };
  });
  const requestRecords = usageRecords.filter((record) => record.acceptedRequests > 0);
  const firstRequestDelays = usageRecords.filter((record) => record.firstRequestDelay !== null).map((record) => record.firstRequestDelay);
  const firstGenerationDelays = usageRecords.filter((record) => record.firstGenerationDelay !== null).map((record) => record.firstGenerationDelay);
  const spans = requestRecords.map((record) => record.observedSpan);
  const sessionLengths = requestRecords.flatMap((record) => record.sessionCount > 0 ? [record.longestSessionMs] : []);
  const totalAcceptedRequests = usageRecords.reduce((total, record) => total + record.acceptedRequests, 0);
  return {
    windowStart: new Date(windowStart).toISOString(),
    windowDays: RECENT_SIGNUP_WINDOW_DAYS,
    signups: recent.length,
    accountsWithAcceptedRequests: requestRecords.length,
    accountsWithSuccessfulGeneration: usageRecords.filter((record) => record.firstGenerationDelay !== null).length,
    accountsWithSecondSession: usageRecords.filter((record) => record.secondSession).length,
    totalAcceptedRequests,
    averageAcceptedRequestsPerRequestingAccount: average(requestRecords.map((record) => record.acceptedRequests)),
    averageMinutesToFirstRequest: average(firstRequestDelays.map((value) => minutes(value))),
    averageMinutesToFirstGeneration: average(firstGenerationDelays.map((value) => minutes(value))),
    accountsWithObservedSessionSpan: spans.filter((value) => value > 0).length,
    averageObservedSessionSpanMinutes: average(spans.map((value) => minutes(value))),
    longestObservedSessionSpanMinutes: spans.length ? Math.max(...spans.map((value) => minutes(value))) : 0,
    averageLongestSessionMinutes: average(sessionLengths.map((value) => minutes(value))),
    longestSessionMinutes: sessionLengths.length ? Math.max(...sessionLengths.map((value) => minutes(value))) : 0,
    totalObservedSessions: usageRecords.reduce((total, record) => total + record.sessionCount, 0),
    walletCredits: {
      tracked: false,
      note: 'Wallet credits are grants and top-ups; chat uses the hourly request meter and does not debit wallet balance.',
    },
  };
}

function dateSequence(now, count = MAX_COHORT_DAYS) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() - (count - 1 - index));
    return funnelDay(date.getTime());
  });
}

async function readProfiles(url, token) {
  const keyResponse = await fetch(`${url}/keys/${encodeURIComponent('stellar:user:*')}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!keyResponse.ok) throw new Error('Could not read account cohort data.');
  const keys = (await keyResponse.json()).result || [];
  if (!Array.isArray(keys) || !keys.length) return [];
  const values = await pipeline(url, token, keys.slice(0, 1000).map((key) => ['GET', key]));
  return values.map((entry) => {
    try { return JSON.parse(entry?.result || 'null'); } catch { return null; }
  }).filter(Boolean);
}

export async function readFunnelMetrics({ url, token, now = Date.now() }) {
  const empty = {
    ok: false,
    generatedAt: new Date(now).toISOString(),
    historical: { accounts: 0, everGenerated: 0, legacyObserved: 0 },
    cohorts: [],
    today: null,
    error: 'Account storage is not configured.',
  };
  if (!url || !token) return empty;

  try {
    const days = dateSequence(now);
    const eventNames = ['signup', 'activated-within-24h', 'second-session-within-7d', 'retained-d1', 'retained-d7'];
    const commands = days.flatMap((day) => eventNames.map((event) => ['SCARD', cohortKey(event, day)]));
    const [values, profiles] = await Promise.all([pipeline(url, token, commands), readProfiles(url, token)]);
    const cohorts = days.map((date, dayIndex) => {
      const offset = dayIndex * eventNames.length;
      const count = (event) => resultNumber(values[offset + eventNames.indexOf(event)]);
      return {
        date,
        signups: count('signup'),
        activatedWithin24h: count('activated-within-24h'),
        secondSessionsWithin7d: count('second-session-within-7d'),
        retainedD1: count('retained-d1'),
        retainedD7: count('retained-d7'),
      };
    });
    const historical = {
      accounts: profiles.length,
      everGenerated: profiles.filter((profile) => Math.max(0, Number(profile.scriptCount) || 0) >= 1).length,
      legacyObserved: profiles.filter((profile) => profile?.funnel?.legacy).length,
    };
    const recentUsage = summarizeRecentUsage(profiles, now);
    const today = summarizeTodayActivation(profiles, now);
    return { ok: true, generatedAt: new Date(now).toISOString(), historical, recentUsage, today, cohorts, error: '' };
  } catch (error) {
    return { ...empty, error: error?.message || 'Could not read activation metrics.' };
  }
}

export { RETURN_SESSION_GAP_MS };
