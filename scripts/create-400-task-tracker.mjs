import { writeFileSync } from 'node:fs';

const rows = ['# Stellar AI — 400-task progress tracker', '', '> This tracker counts implementation tasks, not time. A task becomes complete only after its code or documentation is finished and the relevant tests/checks pass.', '', '| Task | Status | Scope | Evidence | Checkpoint |', '|---:|:---:|---|---|---|'];
for (let task = 1; task <= 400; task += 1) {
  if (task === 1) rows.push('| 1 | ✅ Complete | Multi-AI provider contract, role routing, plan gating, and Anthropic-compatible SSE envelope | `tests/multi-model-routing.test.mjs`; 20 Stellar AI tests pass | `f68195f` |');
  else if (task === 2) rows.push('| 2 | ✅ Complete | Retryable built-in-provider failure falls back once to the existing Anthropic tier | `tests/multi-model-routing.test.mjs`; 21 Stellar AI tests pass | `b9085b5` |');
  else if (task === 3) rows.push('| 3 | ✅ Complete | Roblox, FiveM, mixed, and general platform-aware quality gates | `tests/multi-model-routing.test.mjs`; 24 Stellar AI tests pass | `7023cac` |');
  else if (task === 4) rows.push('| 4 | ✅ Complete | Roblox Build Pack, FiveM resource, audit, and general workflow-mode contracts | `tests/multi-model-routing.test.mjs`; full suite 27 tests pass | `063b459` |');
  else if (task === 5) rows.push('| 5 | ✅ Complete | QBCore, ESX, ox_lib, standalone, and conflicting-framework safety context | `tests/multi-model-routing.test.mjs`; full suite 30 tests pass | `c714b87` |');
  else if (task === 6) rows.push('| 6 | ✅ Complete | Mobile plans-modal dynamic scrolling, overscroll containment, and safe-area padding | `app.html`; 30 tests, phone/tablet screenshots, static smoke checks | `e6c8fe6` |');
  else if (task === 7) rows.push('| 7 | ✅ Complete | Provider-specific GPT, Claude, Gemini, and unknown-model token/reasoning contract | `tests/multi-model-routing.test.mjs`; full suite 34 tests pass | `2060de9` |');
  else if (task === 8) rows.push('| 8 | ✅ Complete | Planner, implementer, researcher, security, and tester output contracts | `tests/multi-model-routing.test.mjs`; full suite 36 tests pass | `f3ffa6f` |');
  else if (task === 9) rows.push('| 9 | ✅ Complete | Truthful specialist-role descriptions aligned to deployed research, security, and tester contracts | `app.html`; full suite 36 tests, phone/tablet captures, static smoke checks | `4ecdf6c` |');
  else if (task === 10) rows.push('| 10 | ✅ Complete | Strict security JSON Schema response contract for Forge-routed reviews | `tests/multi-model-routing.test.mjs`; full suite 37 tests pass | `3a8bb0d` |');
  else if (task === 11) rows.push('| 11 | ✅ Complete | Strict planner and tester JSON Schema response contracts | `tests/multi-model-routing.test.mjs`; full suite 38 tests pass | `b1ff6d6` |');
  else if (task === 12) rows.push('| 12 | ✅ Complete | Strict researcher JSON Schema with claim-level provenance and uncertainty fields | `tests/multi-model-routing.test.mjs`; full suite 39 tests pass | `e86cb32` |');
  else if (task === 13) rows.push('| 13 | ✅ Complete | Strict implementer JSON Schema for complete destination-labelled file bundles | `tests/multi-model-routing.test.mjs`; full suite 40 tests pass | `7b47803` |');
  else if (task === 14) rows.push('| 14 | ✅ Complete | Wire-level forwarding test for all role schemas and stream compatibility | `tests/multi-model-routing.test.mjs`; full suite 41 tests pass | `7212e8d` |');
  else if (task === 15) rows.push('| 15 | ✅ Complete | Fallback test preserving FiveM QBCore role, platform, workflow, and framework guidance | `tests/multi-model-routing.test.mjs`; full suite 42 tests pass | `08c3ce6` |');
  else if (task === 16) rows.push('| 16 | ✅ Complete | Mixed Roblox/FiveM isolation and conservative framework ambiguity regression coverage | `tests/multi-model-routing.test.mjs`; full suite 43 tests pass | `e6fd77d` |');
  else if (task === 17) rows.push('| 17 | ✅ Complete | Structured-output fallback transparency notice and regression coverage | `api/chat.js`; `tests/multi-model-routing.test.mjs`; full suite 44 tests pass | `68e3708` |');
  else if (task === 18) rows.push('| 18 | ✅ Complete | Retryable Forge network-error normalization with existing Anthropic fallback | `api/chat.js`; `tests/multi-model-routing.test.mjs`; full suite 45 tests pass | `a07007e` |');
  else if (task === 19) rows.push('| 19 | ✅ Complete | AbortError propagation without fallback request | `tests/multi-model-routing.test.mjs`; full suite 46 tests pass | `518ddc7` |');
  else if (task === 20) rows.push('| 20 | ✅ Complete | Malformed Forge JSON normalization with existing Anthropic fallback | `api/chat.js`; `tests/multi-model-routing.test.mjs`; full suite 47 tests pass | `febcb15` |');
  else if (task === 21) rows.push('| 21 | ✅ Complete | Anthropic candidate retry after non-abort network error | `api/chat.js`; `tests/multi-model-routing.test.mjs`; full suite 48 tests pass | `cf173d5` |');
  else if (task === 22) rows.push('| 22 | ✅ Complete | Direct Anthropic AbortError propagation without trying another candidate | `tests/multi-model-routing.test.mjs`; full suite 49 tests pass | `559164f` |');
  else if (task === 23) rows.push('| 23 | ✅ Complete | Terminal Anthropic failure returns retryable 503 after all candidates fail | `tests/multi-model-routing.test.mjs`; full suite 50 tests pass | `dfc85c3` |');
  else if (task === 24) rows.push('| 24 | ✅ Complete | Direct Anthropic 404 fallback preserves the configured candidate stream | `tests/multi-model-routing.test.mjs`; full suite 51 tests pass | `9ea039e` |');
  else if (task === 25) rows.push('| 25 | ✅ Complete | Caller AbortSignal forwarded unchanged to Anthropic fetch | `tests/multi-model-routing.test.mjs`; full suite 52 tests pass | `810c531` |');
  else if (task === 26) rows.push('| 26 | ✅ Complete | Caller AbortSignal forwarded unchanged to Forge fetch | `tests/multi-model-routing.test.mjs`; full suite 53 tests pass; included in green production deployment `c27fc10` | `1864dd0` |');
  else if (task === 27) rows.push('| 27 | ✅ Complete | Forge 200 response without a usable completion falls back to the existing Anthropic stream | `tests/multi-model-routing.test.mjs`; full suite 54 tests pass; green Vercel deployment | `6cd0d73` |');
  else if (task === 28) rows.push('| 28 | ✅ Complete | Whitespace-only Forge completion is normalized to retryable empty-output failure and falls back to Anthropic | `api/chat.js`; `tests/multi-model-routing.test.mjs`; full suite 55 tests pass; green Vercel deployment | `2a69944` |');
  else if (task === 29) rows.push('| 29 | ✅ Complete | Forge-to-Anthropic fallback preserves the complete specialist system prompt unchanged | `tests/multi-model-routing.test.mjs`; full suite 56 tests pass; green Vercel deployment | `4793027` |');
  else rows.push(`| ${task} | ☐ Pending | Next approved implementation task | — | — |`);
}
rows.push('', '## Current count', '', '**29 / 400 implementation tasks complete.** The counter must not be increased because of planning, waiting, or unverified claims.', '', '## Protected boundary', '', 'Auth, payments, secrets, package files, Vercel configuration, database code, and unrelated API/server behavior remain protected unless a later task names an explicit approved change.');
writeFileSync('PROGRESS_400.md', `${rows.join('\n')}\n`);
