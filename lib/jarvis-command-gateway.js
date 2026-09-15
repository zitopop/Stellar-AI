import { randomUUID } from 'node:crypto';

const ALLOWED = new Set(['health','stellar-status','git-status','run-tests','deployment-status','inbox-summary']);
const SENSITIVE = new Set(['spend','purchase','delete','security','credentials','kyc','contract']);

function kv() {
  return { url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN };
}

async function set(key, value, ttl = 900) {
  const { url, token } = kv();
  if (!url || !token) throw new Error('Jarvis task storage unavailable.');
  const encoded = encodeURIComponent(JSON.stringify(value));
  const response = await fetch(`${url}/set/${encodeURIComponent(key)}/${encoded}?ex=${ttl}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error('Jarvis task could not be queued.');
}

async function get(key) {
  const { url, token } = kv();
  if (!url || !token) return null;
  const response = await fetch(`${url}/get/${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.result == null) return null;
  try { return JSON.parse(data.result); } catch { return data.result; }
}

export function classifyJarvisCommand(command) {
  const text = String(command || '').toLowerCase();
  if ([...SENSITIVE].some((word) => text.includes(word))) return { level: 'approval', executable: false };
  const action = [...ALLOWED].find((candidate) => text === candidate || text.startsWith(`${candidate} `));
  return action ? { level: 'safe', executable: true, action } : { level: 'unsupported', executable: false };
}

export async function queueJarvisCommand(command, context = {}) {
  const policy = classifyJarvisCommand(command);
  if (!policy.executable) return { ok: false, ...policy };
  const id = randomUUID();
  const task = { id, action: policy.action, command: String(command).slice(0, 500), context, status: 'queued', createdAt: Date.now() };
  await set(`stellar:jarvis:task:${id}`, task);
  await set('stellar:jarvis:task:latest', { id }, 900);
  return { ok: true, id, status: 'queued', action: policy.action };
}

export async function readJarvisCommand(id) {
  return get(`stellar:jarvis:task:${String(id || '').slice(0, 100)}`);
}

export const JARVIS_SAFE_ACTIONS = [...ALLOWED];
