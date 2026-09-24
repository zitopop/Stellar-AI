import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const agent = readFileSync(new URL('../lib/desktop-agent-handler.js', import.meta.url), 'utf8');
const planner = readFileSync(new URL('../lib/desktop-plan-handler.js', import.meta.url), 'utf8');
const page = readFileSync(new URL('../desktop-agent.html', import.meta.url), 'utf8');
const entry = readFileSync(new URL('../stellar-desktop-agent-ui.js', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

assert.match(agent, /function account\(req,res\)/);
assert.doesNotMatch(agent, /Owner access is required|isOwnerEmail/);
assert.match(agent, /accountHash:hash\(String\(session\.email\)/);
assert.match(agent, /Task does not belong to this device/);
assert.match(agent, /task\.accountHash.*Task not found/);
assert.match(agent, /underLimit\(session\.email,'pair'/);
assert.match(agent, /underLimit\(session\.email,'task'/);
assert.match(agent, /output:redactSensitive/);
assert.match(agent, /previousId.*stellar:desktop:device/s);

assert.doesNotMatch(planner, /Owner access is required|isOwnerEmail/);
assert.match(planner, /allowPlan\(session\.email\)/);
assert.match(planner, /promptHasSecret/);
assert.match(page, /verifyUser/);
assert.match(page, /PC Agent Beta/);
assert.match(entry, /isSignedIn/);

console.log('desktop-agent public beta safeguards: ok');

assert.match(app, /id="desktop-agent-nav" class="settings-row signed-in-only"/);
assert.doesNotMatch(app, /<p class="side-title">Agents<\/p>/);
assert.match(app, /document\.querySelectorAll\('\.signed-in-only'\)/);
assert.match(app, /id="roblox-studio-nav" class="settings-row owner-only"/);

