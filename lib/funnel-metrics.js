import crypto from 'crypto';

const DAY_MS = 24 * 60 * 60 * 1000;
const RETURN_SESSION_GAP_MS = 30 * 60 * 1000;
const MAX_COHORT_DAYS = 8;

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
    return { ok: true, generatedAt: new Date(now).toISOString(), historical, cohorts, error: '' };
  } catch (error) {
    return { ...empty, error: error?.message || 'Could not read activation metrics.' };
  }
}

export { RETURN_SESSION_GAP_MS };
