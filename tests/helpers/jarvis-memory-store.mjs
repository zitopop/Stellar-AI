export function memoryStore() {
  const tasks = new Map(), leases = new Map(), cancellations = new Set(), pending = new Set();
  let worker = null;
  const copy = value => value == null ? value : structuredClone(value);
  return {
    tasks, leases, pending,
    async create(mission) { if (!tasks.has(mission.id)) { tasks.set(mission.id, copy(mission)); pending.add(mission.id); } return copy(tasks.get(mission.id)); },
    async load(id) { return copy(tasks.get(id)); },
    async list(email) { return [...tasks.values()].filter(m => m.ownerEmail === email).map(copy); },
    async queued() { return [...pending]; },
    async drop(id) { pending.delete(id); },
    async claim(id, token) { if (leases.has(id)) return false; leases.set(id, token); return true; },
    async release(id, token) { if (leases.get(id) === token) leases.delete(id); },
    async save(mission, token, keepQueued) { if (leases.get(mission.id) !== token) throw new Error('Lost lease'); tasks.set(mission.id, copy(mission)); if (keepQueued) pending.add(mission.id); else pending.delete(mission.id); },
    async requestCancel(id) { cancellations.add(id); },
    async cancelled(id) { return cancellations.has(id); },
    async markWorker(at) { worker = at; },
    async lastWorker() { return worker; },
  };
}
