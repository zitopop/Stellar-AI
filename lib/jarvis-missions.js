import { createHash, randomUUID } from 'node:crypto';
import { stellarBusinessDirectory } from './jarvis-business-context.js';
import { isOwnerEmail } from './auth.js';

const PREFIX = 'stellar:jarvis:missions:';
const RETENTION = 30 * 24 * 60 * 60;
const LEASE_SECONDS = 330;
const TERMINAL = new Set(['completed', 'failed', 'cancelled']);
const TITLES = { customers: 'Customer research', products: 'Script product studio', operations: 'Operations plan', reviewer: 'Owner brief and review' };
const hash = value => createHash('sha256').update(String(value)).digest('hex');
export class MissionError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

// Every mutation is durable. A fencing token prevents an expired worker from
// overwriting a successor, and creation + indexing are one Redis transaction.
export function createRedisMissionStore({ fetcher = fetch, env = process.env } = {}) {
  const command = async (...args) => {
    if (!env.KV_REST_API_URL || !env.KV_REST_API_TOKEN) throw new MissionError('Jarvis task storage is not configured.', 503);
    let response;
    try {
      response = await fetcher(env.KV_REST_API_URL.replace(/\/$/, ''), {
        method: 'POST', headers: { Authorization: `Bearer ${env.KV_REST_API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(args), signal: AbortSignal.timeout(8000),
      });
      const body = await response.json();
      if (!response.ok || body.error) throw new Error('storage');
      return body.result;
    } catch { throw new MissionError('Jarvis could not reach task storage. Your last saved progress is preserved.', 503); }
  };
  const key = id => `${PREFIX}task:${id}`;
  const queue = `${PREFIX}queue`;
  const lock = id => `${PREFIX}lease:${id}`;
  return {
    async create(mission) {
      const result = await command('EVAL', `
        local existing = redis.call('GET', KEYS[1])
        if existing then return existing end
        if tonumber(redis.call('GET', KEYS[4]) or '0') >= 8 then return 'LIMIT' end
        redis.call('INCR', KEYS[4]); redis.call('EXPIRE', KEYS[4], 172800)
        redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[4])
        redis.call('ZADD', KEYS[2], ARGV[2], ARGV[3]); redis.call('EXPIRE', KEYS[2], ARGV[4])
        redis.call('ZREMRANGEBYRANK', KEYS[2], 0, -51)
        redis.call('ZADD', KEYS[3], ARGV[2], ARGV[3])
        return ARGV[1]`, 4, key(mission.id), `${PREFIX}owner:${hash(mission.ownerEmail)}`, queue,
      `${PREFIX}daily:${hash(mission.ownerEmail)}:${Math.floor(mission.createdAt / 86400000)}`,
      JSON.stringify(mission), mission.createdAt, mission.id, RETENTION);
      if (result === 'LIMIT') throw new MissionError('The daily limit of eight new missions has been reached. Existing results remain available.', 429);
      return JSON.parse(result);
    },
    async load(id) { const raw = await command('GET', key(id)); return raw ? JSON.parse(raw) : null; },
    async list(ownerEmail) {
      const ids = await command('ZREVRANGE', `${PREFIX}owner:${hash(ownerEmail)}`, 0, 49) || [];
      if (!ids.length) return [];
      const records = await command('MGET', ...ids.map(key));
      return records.filter(Boolean).map(raw => JSON.parse(raw));
    },
    async queued() { return await command('ZRANGE', queue, 0, 19) || []; },
    async drop(id) { await command('ZREM', queue, id); },
    async claim(id, token) { return (await command('SET', lock(id), token, 'NX', 'EX', LEASE_SECONDS)) === 'OK'; },
    async release(id, token) {
      await command('EVAL', "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0", 1, lock(id), token);
    },
    async save(mission, token, keepQueued) {
      const saved = await command('EVAL', `
        if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
        redis.call('SET', KEYS[2], ARGV[2], 'EX', ARGV[3])
        if ARGV[4] == '1' then redis.call('ZADD', KEYS[3], ARGV[5], ARGV[6]) else redis.call('ZREM', KEYS[3], ARGV[6]) end
        return 1`, 3, lock(mission.id), key(mission.id), queue, token, JSON.stringify(mission), RETENTION,
      keepQueued ? '1' : '0', mission.createdAt, mission.id);
      if (Number(saved) !== 1) throw new MissionError('Another worker has resumed this mission. Refresh to see its progress.', 409);
    },
    async requestCancel(id) { await command('SET', `${PREFIX}cancel:${id}`, '1', 'EX', RETENTION); },
    async cancelled(id) { return (await command('GET', `${PREFIX}cancel:${id}`)) === '1'; },
    async markWorker(at) { await command('SET', `${PREFIX}last-worker`, String(at), 'EX', RETENTION); },
    async lastWorker() { return Number(await command('GET', `${PREFIX}last-worker`)) || null; },
  };
}

export function publicMission(mission, now = Date.now()) {
  const { ownerEmail, ...safe } = mission;
  return { ...safe, canResume: mission.status === 'running' && now - mission.updatedAt > LEASE_SECONDS * 1000 };
}

export function createMissionService({ store, providers, now = Date.now, uuid = randomUUID } = {}) {
  async function owned(id, ownerEmail) {
    if (!/^[a-f0-9]{40}$/.test(String(id || ''))) throw new MissionError('Mission not found.', 404);
    const mission = await store.load(id);
    if (!mission || mission.ownerEmail !== ownerEmail) throw new MissionError('Mission not found.', 404);
    return mission;
  }
  async function create(ownerEmail, input) {
    const kind = String(input.kind || 'everything');
    if (!['everything', 'customers', 'products', 'operations'].includes(kind)) throw new MissionError('Choose a supported mission type.');
    const objective = String(input.objective || '').trim();
    if (objective.length < 10 || objective.length > 4000) throw new MissionError('Describe the work in 10 to 4,000 characters.');
    if (!/^[a-zA-Z0-9_-]{12,80}$/.test(String(input.requestId || ''))) throw new MissionError('A valid request ID is required. Refresh and try again.');
    const roles = kind === 'everything' ? ['customers', 'products', 'operations', 'reviewer'] : [kind, 'reviewer'];
    const mission = {
      id: hash(`${ownerEmail}:${input.requestId}`).slice(0, 40), ownerEmail,
      title: String(input.title || (kind === 'everything' ? 'My business briefing' : TITLES[kind])).trim().slice(0, 100),
      objective, kind, status: 'queued', createdAt: now(), updatedAt: now(),
      steps: roles.map(role => ({ id: role, role, title: TITLES[role], status: 'queued', attempts: 0 })),
      notify: { email: input.notify?.email === true, call: input.notify?.call === true }, notifications: {},
    };
    return publicMission(await store.create(mission), now());
  }
  async function run(id, ownerEmail, { retry = false } = {}) {
    await owned(id, ownerEmail);
    const token = uuid();
    if (!await store.claim(id, token)) throw new MissionError('Jarvis is already running this mission. Refresh to see progress.', 409);
    try {
      const mission = await owned(id, ownerEmail);
      const persist = async (keepQueued = !TERMINAL.has(mission.status)) => {
        mission.updatedAt = now(); await store.save(mission, token, keepQueued);
      };
      const checkCancelled = async () => {
        if (!await store.cancelled(id)) return false;
        mission.status = 'cancelled';
        for (const step of mission.steps) if (step.status !== 'completed') step.status = 'cancelled';
        await persist(false); return true;
      };
      if (mission.status === 'cancelled' || await checkCancelled()) return publicMission(mission, now());
      if (mission.status === 'failed' && !retry) return publicMission(mission, now());
      if (retry && mission.steps.some(step => step.status !== 'completed' && step.attempts >= 3)) {
        throw new MissionError('This mission reached its retry limit. Review the saved results before creating another.');
      }
      const capability = providers.capabilities();
      if (mission.status !== 'completed' && !capability.ai) throw new MissionError('The Jarvis AI provider is not configured.', 503);
      if (mission.status !== 'completed') { mission.status = 'running'; delete mission.error; await persist(true); }
      for (const step of mission.steps) {
        if (step.status === 'completed') continue;
        if (await checkCancelled()) return publicMission(mission, now());
        if (step.attempts >= 3) { mission.status = 'failed'; step.status = 'failed'; step.error = 'Retry limit reached.'; await persist(false); return publicMission(mission, now()); }
        step.status = 'running'; step.attempts += 1; step.startedAt = now(); delete step.error;
        await persist(true);
        try {
          if (['customers', 'products'].includes(step.role) && !step.sources) {
            if (!capability.search) throw new MissionError('Web research is not configured. This task needs a connected search provider.', 503);
            const focus = step.role === 'customers' ? 'customer demand market opportunities' : 'FiveM Roblox script products official documentation';
            step.sources = await providers.research(`${mission.objective.slice(0, 320)} ${focus}`);
            if (!step.sources.length) throw new MissionError('No research sources were found. Refine the objective and try again.');
            await persist(true);
          }
          const generated = await providers.generate({
            role: step.role, objective: mission.objective, context: stellarBusinessDirectory(), sources: step.sources || [],
            previousResults: mission.steps.filter(item => item.status === 'completed').map(item => ({ role: item.role, text: item.result, sources: item.sources || [] })),
          });
          if (!generated?.text?.trim()) throw new Error('Empty result');
          step.result = generated.text; step.usage = generated.usage; step.status = 'completed'; step.completedAt = now();
          await persist(true);
        } catch (error) {
          step.status = 'failed'; step.error = error instanceof MissionError ? error.message : 'This specialist could not finish. Your other results are saved; retry to resume.';
          mission.status = 'failed'; mission.error = step.error;
          await persist(false); return publicMission(mission, now());
        }
      }
      if (await checkCancelled()) return publicMission(mission, now());
      mission.status = 'completed'; mission.completedAt ||= now();
      mission.summary = mission.steps.find(step => step.role === 'reviewer')?.result || '';
      await persist(true);
      for (const channel of ['email', 'call']) {
        if (!mission.notify[channel] || mission.notifications[channel]) continue;
        if (await checkCancelled()) return publicMission(mission, now());
        // Persist intent BEFORE contacting a provider. An interrupted delivery is
        // shown as uncertain and never automatically repeated (especially calls).
        mission.notifications[channel] = { status: 'attempting', message: 'Update requested; delivery is not yet confirmed.', at: now() };
        await persist(true);
        let notification;
        try { notification = await providers.notifyOwner({ channel, mission, ownerEmail }); }
        catch { notification = { status: 'failed', message: 'The update could not be confirmed. Your results remain here.' }; }
        mission.notifications[channel] = { ...notification, at: now() };
        await persist(true);
      }
      await persist(false);
      return publicMission(mission, now());
    } finally { await store.release(id, token).catch(() => {}); }
  }
  async function cancel(id, ownerEmail) {
    const mission = await owned(id, ownerEmail);
    if (TERMINAL.has(mission.status)) return publicMission(mission, now());
    await store.requestCancel(id);
    try { return await run(id, ownerEmail); }
    catch (error) { if (error.status === 409) return { ...publicMission(mission, now()), cancellationRequested: true }; throw error; }
  }
  async function status(ownerEmail) {
    const [missions, lastWorkerAt] = await Promise.all([store.list(ownerEmail), store.lastWorker()]);
    const capabilities = providers.capabilities();
    return { capabilities, schedule: capabilities.scheduler ? 'daily' : 'manual', lastWorkerAt,
      limits: { newMissionsPerDay: 8, attemptsPerSpecialist: 3, retentionDays: 30 },
      missions: missions.filter(mission => mission.ownerEmail === ownerEmail).map(mission => publicMission(mission, now())) };
  }
  async function tick() {
    await store.markWorker(now());
    for (const id of await store.queued()) {
      const mission = await store.load(id);
      if (!mission || !isOwnerEmail(mission.ownerEmail) || ['cancelled', 'failed'].includes(mission.status)) { await store.drop(id); continue; }
      try { await run(id, mission.ownerEmail); return { processed: 1 }; }
      catch (error) { if (error.status === 409) continue; throw error; }
    }
    return { processed: 0 };
  }
  return { create, run, cancel, status, tick };
}
