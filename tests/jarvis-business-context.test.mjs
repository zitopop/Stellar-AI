import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { routeEmailToTeam, stellarTeamDirectory } from '../lib/email-team-routing.js';
import { stellarBusinessDirectory } from '../lib/jarvis-business-context.js';

const voice = readFileSync(new URL('../lib/jarvis-voice.js', import.meta.url), 'utf8');

test('business directory exposes the owner team map and core systems', () => {
  const teams = stellarTeamDirectory();
  const business = stellarBusinessDirectory();
  for (const name of ['AI Manager — Command', 'Sales AI', 'Customer AI', 'Fulfilment AI', 'Chrome Cruiser AI', 'Growth AI', 'Finance & Operations AI']) {
    assert.match(teams, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  for (const system of ['Stellar AI', 'Chrome Cruiser', 'Gmail', 'GitHub + Vercel', 'Stellar Sloths Role Play', 'Roblox']) assert.ok(business.includes(system));
});

test('email routing sends common business mail to the expected owner team', () => {
  assert.equal(routeEmailToTeam({ subject: 'Production deployment failed', from: 'Vercel' }).team, 'AI Manager — Command');
  assert.equal(routeEmailToTeam({ subject: 'Customer needs help with account' }).team, 'Customer AI');
  assert.equal(routeEmailToTeam({ subject: 'Partnership proposal and demo' }).team, 'Sales AI');
  assert.equal(routeEmailToTeam({ subject: 'Shopify storefront update' }).team, 'Chrome Cruiser AI');
});
