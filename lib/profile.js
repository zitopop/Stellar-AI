import crypto from 'crypto';
import { applySuccessfulGenerationFunnel, RETURN_SESSION_GAP_MS } from './funnel-metrics.js';

const REFERRAL_REWARD_PENCE = 100;
const REFERRAL_CODE_PATTERN = /^[A-Z0-9]{8,16}$/;

// A lightweight deterministic digest keeps public aggregate member sets free of raw emails.
function anonymousActivityId(value) {
  let hash = 2166136261;
  for (const character of String(value || '')) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function normaliseEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function parseStoredValue(result) {
  if (!result) return null;
  try { return JSON.parse(result); } catch { return null; }
}

export async function kvGet(url, token, key) {
  const response = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Database read failed');
  return parseStoredValue((await response.json()).result);
}

export async function kvPipeline(url, token, commands) {
  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!response.ok) throw new Error('Database write failed');
  return response.json();
}

export async function kvSet(url, token, key, value, seconds) {
  const command = seconds
    ? ['SET', key, JSON.stringify(value), 'EX', seconds]
    : ['SET', key, JSON.stringify(value)];
  await kvPipeline(url, token, [command]);
}

function referralCode() {
  return crypto.randomBytes(6).toString('base64url').replace(/[^A-Za-z0-9]/g, '').slice(0, 10).toUpperCase();
}

export function validReferralCode(value) {
  return REFERRAL_CODE_PATTERN.test(String(value || '').trim().toUpperCase());
}

/**
 * Ensures a profile has an opaque public referral code. The code mapping is
 * server-written and maps only to the normalised referrer email.
 */
export async function ensureReferralProfile(url, token, email, user) {
  const normalizedEmail = normaliseEmail(email);
  if (!normalizedEmail) throw new Error('A valid account email is required.');
  if (user?.referralCode && validReferralCode(user.referralCode)) return user;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = referralCode();
    const key = `stellar:referral:code:${code}`;
    const response = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['SET', key, JSON.stringify({ email: normalizedEmail, createdAt: Date.now() }), 'NX']]),
    });
    if (!response.ok) throw new Error('Could not create referral link.');
    const payload = await response.json();
    const result = Array.isArray(payload) ? payload[0]?.result : null;
    if (result !== 'OK' && result !== true && result !== 1) continue;

    const updated = { ...user, referralCode: code, referralCreatedAt: Date.now() };
    await kvSet(url, token, `stellar:user:${normalizedEmail}`, updated);
    return updated;
  }
  throw new Error('Could not create a unique referral link.');
}

/**
 * Awards a £1 referral credit exactly once per referred address. A claim is
 * stored at the requested key shape so it is auditable and cannot be replayed.
 */
export async function applyReferralReward(url, token, referredEmail, rawCode) {
  const email = normaliseEmail(referredEmail);
  const code = String(rawCode || '').trim().toUpperCase();
  if (!email || !validReferralCode(code)) return { applied: false, reason: 'missing_or_invalid' };

  const claimKey = `stellar:referral:email:${email}`;
  const priorClaim = await kvGet(url, token, claimKey);
  if (priorClaim) return { applied: false, reason: priorClaim.status === 'awarded' ? 'already_awarded' : 'already_processing' };

  // Claim the referred address before calculating balances. Upstash SET NX is the
  // concurrency guard that makes the referral reward one-time even on retries.
  const claimLock = await kvPipeline(url, token, [[
    'SET', claimKey, JSON.stringify({ status: 'processing', code, startedAt: Date.now() }), 'NX', 'EX', 900,
  ]]);
  const lockResult = Array.isArray(claimLock) ? claimLock[0]?.result : null;
  if (lockResult !== 'OK' && lockResult !== true && lockResult !== 1) return { applied: false, reason: 'already_processing' };

  const codeRecord = await kvGet(url, token, `stellar:referral:code:${code}`);
  const referrerEmail = normaliseEmail(codeRecord?.email);
  if (!referrerEmail || referrerEmail === email) return { applied: false, reason: 'invalid_referrer' };

  const [referredUser, referrerUser] = await Promise.all([
    kvGet(url, token, `stellar:user:${email}`),
    kvGet(url, token, `stellar:user:${referrerEmail}`),
  ]);
  if (!referredUser || !referrerUser) return { applied: false, reason: 'account_missing' };

  const now = Date.now();
  const claim = {
    status: 'awarded',
    code,
    referredEmail: email,
    referrerEmail,
    rewardPence: REFERRAL_REWARD_PENCE,
    awardedAt: now,
  };
  const creditedReferred = {
    ...referredUser,
    walletPence: Math.max(0, Number(referredUser.walletPence) || 0) + REFERRAL_REWARD_PENCE,
    referredBy: referrerEmail,
    referralRewardReceivedAt: now,
    updatedAt: now,
  };
  const creditedReferrer = {
    ...referrerUser,
    walletPence: Math.max(0, Number(referrerUser.walletPence) || 0) + REFERRAL_REWARD_PENCE,
    referralRewardCount: Math.max(0, Number(referrerUser.referralRewardCount) || 0) + 1,
    referralRewardPence: Math.max(0, Number(referrerUser.referralRewardPence) || 0) + REFERRAL_REWARD_PENCE,
    updatedAt: now,
  };

  await kvPipeline(url, token, [
    ['SET', claimKey, JSON.stringify(claim)],
    ['SET', `stellar:user:${email}`, JSON.stringify(creditedReferred)],
    ['SET', `stellar:user:${referrerEmail}`, JSON.stringify(creditedReferrer)],
  ]);
  return { applied: true, referrerEmail, rewardPence: REFERRAL_REWARD_PENCE };
}

export function achievementDefinitions() {
  return [
    { id: 'first-script', label: 'First Script', description: 'Generate your first script.' },
    { id: 'ten-scripts', label: 'Builder', description: 'Generate 10 scripts.' },
    { id: 'fifty-scripts', label: 'Power Builder', description: 'Generate 50 scripts.' },
    { id: 'first-upgrade', label: 'First Upgrade', description: 'Start your first paid plan.' },
  ];
}

export function unlockedAchievements(user) {
  const unlocked = user?.achievements && typeof user.achievements === 'object' ? user.achievements : {};
  return achievementDefinitions().map((achievement) => ({
    ...achievement,
    unlockedAt: unlocked[achievement.id] || null,
  }));
}

export async function recordAcceptedRequest(url, token, email, now = Date.now()) {
  const normalizedEmail = normaliseEmail(email);
  if (!normalizedEmail) return null;
  const userKey = `stellar:user:${normalizedEmail}`;
  const user = await kvGet(url, token, userKey);
  if (!user) return null;

  const prior = user.usage && typeof user.usage === 'object' ? user.usage : {};
  const lastRequestAt = Number(prior.lastRequestAt) || 0;
  const previousSessionStartedAt = Number(prior.currentSessionStartedAt) || 0;
  const startsNewSession = !lastRequestAt || now - lastRequestAt >= RETURN_SESSION_GAP_MS;
  const closedSessionMs = startsNewSession && previousSessionStartedAt && lastRequestAt
    ? Math.max(0, lastRequestAt - previousSessionStartedAt)
    : 0;
  const usage = {
    acceptedRequests: Math.max(0, Number(prior.acceptedRequests) || 0) + 1,
    firstRequestAt: Number(prior.firstRequestAt) || now,
    lastRequestAt: now,
    currentSessionStartedAt: startsNewSession ? now : previousSessionStartedAt || now,
    sessionCount: Math.max(0, Number(prior.sessionCount) || 0) + (startsNewSession ? 1 : 0),
    closedSessionDurationMs: Math.max(0, Number(prior.closedSessionDurationMs) || 0) + closedSessionMs,
    longestClosedSessionMs: Math.max(Math.max(0, Number(prior.longestClosedSessionMs) || 0), closedSessionMs),
  };
  await kvSet(url, token, userKey, { ...user, usage, updatedAt: now });
  return usage;
}

export async function recordScriptGenerated(url, token, email) {
  const normalizedEmail = normaliseEmail(email);
  if (!normalizedEmail) return null;
  const userKey = `stellar:user:${normalizedEmail}`;
  const user = await kvGet(url, token, userKey);
  if (!user) return null;
  const now = Date.now();
  const count = Math.max(0, Number(user.scriptCount) || 0) + 1;
  const achievements = { ...(user.achievements || {}) };
  if (count >= 1 && !achievements['first-script']) achievements['first-script'] = now;
  if (count >= 10 && !achievements['ten-scripts']) achievements['ten-scripts'] = now;
  if (count >= 50 && !achievements['fifty-scripts']) achievements['fifty-scripts'] = now;
  const funnelUpdate = applySuccessfulGenerationFunnel({ email: normalizedEmail, user, now });
  await kvPipeline(url, token, [
    ['SET', userKey, JSON.stringify({ ...user, scriptCount: count, achievements, funnel: funnelUpdate.funnel, updatedAt: now })],
    ['INCR', 'stellar:stats:scripts-generated'],
    ['SADD', 'stellar:stats:active-builders', anonymousActivityId(normalizedEmail)],
    ...funnelUpdate.commands,
  ]);
  return { count, achievements, funnel: funnelUpdate.funnel };
}

export async function recordCountryActivity(url, token, rawCountry) {
  const country = String(rawCountry || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) return 0;
  const result = await kvPipeline(url, token, [['SADD', 'stellar:stats:countries', country]]);
  return Number(result?.[0]?.result) || 0;
}

export async function recordFirstUpgrade(url, token, email) {
  const normalizedEmail = normaliseEmail(email);
  if (!normalizedEmail) return null;
  const userKey = `stellar:user:${normalizedEmail}`;
  const user = await kvGet(url, token, userKey);
  if (!user) return null;
  const achievements = { ...(user.achievements || {}) };
  if (achievements['first-upgrade']) return achievements;
  achievements['first-upgrade'] = Date.now();
  await kvSet(url, token, userKey, { ...user, achievements, updatedAt: Date.now() });
  return achievements;
}
