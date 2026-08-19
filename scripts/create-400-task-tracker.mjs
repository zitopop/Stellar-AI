import { writeFileSync } from 'node:fs';

const rows = ['# Stellar AI — 400-task progress tracker', '', '> This tracker counts implementation tasks, not time. A task becomes complete only after its code or documentation is finished and the relevant tests/checks pass.', '', '| Task | Status | Scope | Evidence | Checkpoint |', '|---:|:---:|---|---|---|'];
for (let task = 1; task <= 400; task += 1) {
  if (task === 1) rows.push('| 1 | ✅ Complete | Multi-AI provider contract, role routing, plan gating, and Anthropic-compatible SSE envelope | `tests/multi-model-routing.test.mjs`; 20 Stellar AI tests pass | `pending-task-1-checkpoint` |');
  else rows.push(`| ${task} | ☐ Pending | Next approved implementation task | — | — |`);
}
rows.push('', '## Current count', '', '**1 / 400 implementation tasks complete.** The counter must not be increased because of planning, waiting, or unverified claims.', '', '## Protected boundary', '', 'Auth, payments, secrets, package files, Vercel configuration, database code, and unrelated API/server behavior remain protected unless a later task names an explicit approved change.');
writeFileSync('PROGRESS_400.md', `${rows.join('\n')}\n`);
