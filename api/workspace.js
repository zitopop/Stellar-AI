// api/workspace.js — signed-in Projects, Memory and workspace preferences
import { requireSession } from '../lib/auth.js';

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

function setCors(req, res) {
  const origin = req.headers.origin || '';
  const allowed = /^https:\/\/(?:[a-z0-9-]+\.)?trystellarai\.com$/i.test(origin)
    || /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin)
    || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : 'https://trystellarai.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
}

const cleanText = (value, max) => String(value || '')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  .trim().slice(0, max);
const cleanId = (value) => cleanText(value, 120).replace(/[^a-zA-Z0-9:_-]/g, '');
const stamp = (value) => Number.isFinite(Number(value)) ? Number(value) : Date.now();

function emptyWorkspace() {
  return {
    version: 1,
    projects: [],
    memories: [],
    preferences: { mode: 'chat', memoryEnabled: true, showSources: true },
  };
}

function sanitizeWorkspace(input) {
  const source = input && typeof input === 'object' ? input : {};
  const projects = Array.isArray(source.projects) ? source.projects.slice(0, 24).map((project) => ({
    id: cleanId(project?.id) || `project_${Date.now()}`,
    name: cleanText(project?.name || 'Untitled project', 80),
    description: cleanText(project?.description, 400),
    instructions: cleanText(project?.instructions, 2400),
    chatIds: Array.isArray(project?.chatIds)
      ? [...new Set(project.chatIds.map(cleanId).filter(Boolean))].slice(0, 60)
      : [],
    createdAt: stamp(project?.createdAt),
    updatedAt: stamp(project?.updatedAt),
  })).filter((project) => project.id && project.name) : [];

  const memories = Array.isArray(source.memories) ? source.memories.slice(0, 30).map((memory) => ({
    id: cleanId(memory?.id) || `memory_${Date.now()}`,
    text: cleanText(memory?.text, 700),
    createdAt: stamp(memory?.createdAt),
  })).filter((memory) => memory.id && memory.text) : [];

  const allowedModes = new Set(['chat', 'search', 'research']);
  const requestedMode = cleanText(source.preferences?.mode, 20).toLowerCase();
  return {
    version: 1,
    projects,
    memories,
    preferences: {
      mode: allowedModes.has(requestedMode) ? requestedMode : 'chat',
      memoryEnabled: source.preferences?.memoryEnabled !== false,
      showSources: source.preferences?.showSources !== false,
    },
  };
}

async function readValue(key) {
  const response = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  if (!response.ok) throw new Error('Database read failed');
  const result = (await response.json()).result;
  return result ? JSON.parse(result) : null;
}

async function writeValue(key, value) {
  const response = await fetch(`${KV_URL}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(JSON.stringify(value)),
  });
  if (!response.ok) throw new Error('Database write failed');
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed.' });

  const session = requireSession(req, res);
  if (!session) return;
  if (!KV_URL || !KV_TOKEN) return res.status(500).json({ error: 'Account storage is not configured.' });
  const key = `stellar:workspace:${session.email}`;

  try {
    if (req.method === 'GET') {
      const stored = await readValue(key);
      return res.status(200).json({ workspace: sanitizeWorkspace(stored || emptyWorkspace()) });
    }
    const payload = sanitizeWorkspace(req.body?.workspace || req.body);
    await writeValue(key, payload);
    return res.status(200).json({ ok: true, workspace: payload });
  } catch {
    return res.status(500).json({ error: req.method === 'GET' ? 'Could not load workspace right now.' : 'Could not save workspace right now.' });
  }
}
