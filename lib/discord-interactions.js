// lib/discord-interactions.js — serverless Discord interaction fallback.
import { createHash, createPublicKey, verify as verifySignature } from 'node:crypto';

const DISCORD_API = 'https://discord.com/api/v10';
const SITE_URL = 'https://trystellarai.com';
const INTERACTIONS_URL = SITE_URL + '/api/webhook?source=discord-interactions';
const EPHEMERAL = 64;
const PERMISSION_ADMINISTRATOR = 8n;
const PERMISSION_MANAGE_CHANNELS = 16n;
const PERMISSION_MANAGE_GUILD = 32n;
const PLAN_ROLE_NAMES = Object.freeze({
  free: 'Stellar Free',
  starter: 'Stellar Starter',
  plus: 'Stellar Plus',
  pro: 'Stellar Pro',
});
const SERVER_PASS_ROLE = 'Server Pass';
const SUPPORT_ROLE = 'Stellar Support';
const COMMANDS = Object.freeze([
  {
    name: 'debug',
    type: 1,
    description: 'Fix a broken FiveM or Roblox Lua/Luau script with Stellar AI',
    contexts: [0],
    integration_types: [0],
    options: [{ type: 3, name: 'code', description: 'Paste your broken script or F8/Output error log', required: true, max_length: 6000 }],
  },
  { name: 'sync', type: 1, description: 'Sync your Stellar account and Discord access', contexts: [0], integration_types: [0] },
  {
    name: 'serverpass',
    type: 1,
    description: 'Activate or check Server Pass for this Discord server',
    contexts: [0],
    integration_types: [0],
    options: [{
      type: 3,
      name: 'action',
      description: 'What you want to do',
      required: false,
      choices: [
        { name: 'Activate this server', value: 'activate' },
        { name: 'Check status', value: 'status' },
      ],
    }],
  },
  {
    name: 'support',
    type: 1,
    description: 'Get Stellar support for this server or account',
    contexts: [0],
    integration_types: [0],
    options: [{ type: 3, name: 'issue', description: 'Briefly describe what you need help with', required: true, max_length: 500 }],
  },
  { name: 'ticket-close', type: 1, description: 'Close the current Stellar support ticket', contexts: [0], integration_types: [0] },
  { name: 'stellar-status', type: 1, description: 'Check Stellar bot and web service status', contexts: [0], integration_types: [0] },
  {
    name: 'stellar-setup',
    type: 1,
    description: 'Check the safe Stellar Discord setup for this server',
    contexts: [0],
    integration_types: [0],
    default_member_permissions: '8',
    options: [{
      type: 3,
      name: 'mode',
      description: 'Choose a full Stellar community hub or a smaller Server Pass setup',
      required: false,
      choices: [
        { name: 'Server Pass only', value: 'server-pass' },
        { name: 'Full community hub', value: 'community' },
      ],
    }],
  },
]);

let tokenCache = null;
let applicationCache = null;

function envText(name, env = process.env) {
  return String(env?.[name] || '').trim();
}

function cleanText(value, max = 1800) {
  return String(value || '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

function optionValue(interaction, name) {
  return interaction?.data?.options?.find((option) => option?.name === name)?.value ?? '';
}

function interactionUserId(interaction) {
  return String(interaction?.member?.user?.id || interaction?.user?.id || '').trim();
}

function hasPermission(interaction, bit) {
  try {
    const value = BigInt(String(interaction?.member?.permissions || '0'));
    return Boolean((value & PERMISSION_ADMINISTRATOR) || (value & bit));
  } catch {
    return false;
  }
}

async function discordClientCredentials({ env = process.env, fetcher = fetch } = {}) {
  const clientId = envText('DISCORD_CLIENT_ID', env) || envText('DISCORD_APPLICATION_ID', env);
  const clientSecret = envText('DISCORD_CLIENT_SECRET', env);
  if (!clientId || !clientSecret) throw new Error('Discord OAuth client credentials are not configured.');

  const now = Date.now();
  if (tokenCache?.token && tokenCache.expiresAt > now + 60_000) return { clientId, token: tokenCache.token };

  const response = await fetcher(DISCORD_API + '/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'applications.commands.update' }),
    signal: AbortSignal.timeout(8000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.access_token) throw new Error('Discord client-credentials authentication failed.');
  tokenCache = {
    token: String(data.access_token),
    expiresAt: now + Math.max(60, Number(data.expires_in) || 3600) * 1000,
  };
  return { clientId, token: tokenCache.token };
}

async function discordApplication({ env = process.env, fetcher = fetch } = {}) {
  const configuredKey = envText('DISCORD_PUBLIC_KEY', env);
  const configuredId = envText('DISCORD_CLIENT_ID', env) || envText('DISCORD_APPLICATION_ID', env);
  if (configuredKey && /^[a-f0-9]{64}$/i.test(configuredKey)) {
    return { id: configuredId, verify_key: configuredKey };
  }
  const now = Date.now();
  if (applicationCache?.verify_key && applicationCache.expiresAt > now + 60_000) return applicationCache;

  const { token } = await discordClientCredentials({ env, fetcher });
  const response = await fetcher(DISCORD_API + '/oauth2/@me', {
    headers: { Authorization: 'Bearer ' + token },
    signal: AbortSignal.timeout(8000),
  });
  const data = await response.json().catch(() => ({}));
  const application = data?.application || {};
  if (!response.ok || !/^[a-f0-9]{64}$/i.test(String(application?.verify_key || ''))) {
    throw new Error('Discord application verification key is unavailable.');
  }
  applicationCache = { ...application, expiresAt: now + 30 * 60 * 1000 };
  return applicationCache;
}

function ed25519Key(hex) {
  const raw = Buffer.from(String(hex || ''), 'hex');
  if (raw.length !== 32) throw new Error('Invalid Discord verification key.');
  return createPublicKey({
    key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), raw]),
    format: 'der',
    type: 'spki',
  });
}

export async function verifyDiscordInteraction({ rawBody, signature, timestamp, env = process.env, fetcher = fetch } = {}) {
  if (!signature || !timestamp || typeof rawBody !== 'string') return false;
  try {
    const application = await discordApplication({ env, fetcher });
    return verifySignature(
      null,
      Buffer.from(String(timestamp) + rawBody),
      ed25519Key(application.verify_key),
      Buffer.from(String(signature), 'hex'),
    );
  } catch {
    return false;
  }
}

async function kvClaimBootstrap({ env = process.env, fetcher = fetch } = {}) {
  const url = envText('KV_REST_API_URL', env).replace(/\/$/, '');
  const token = envText('KV_REST_API_TOKEN', env);
  if (!url || !token) return true;
  try {
    const response = await fetcher(url + '/pipeline', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify([['SET', 'stellar:discord-interactions-bootstrap-lock', String(Date.now()), 'EX', 600, 'NX']]),
      signal: AbortSignal.timeout(6000),
    });
    const rows = await response.json().catch(() => []);
    return response.ok && rows?.[0]?.result === 'OK';
  } catch {
    return false;
  }
}

async function discordApi(path, { method = 'GET', body, auth, fetcher = fetch } = {}) {
  const response = await fetcher(DISCORD_API + path, {
    method,
    headers: {
      ...(auth ? { Authorization: auth } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(cleanText(data?.message || ('Discord API request failed (' + response.status + ').'), 300));
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function registerCommands(clientId, bearer, fetcher) {
  const results = [];
  for (const command of COMMANDS) {
    const result = await discordApi('/applications/' + encodeURIComponent(clientId) + '/commands', {
      method: 'POST',
      auth: 'Bearer ' + bearer,
      body: command,
      fetcher,
    });
    results.push({ name: command.name, id: result?.id || null });
  }
  return results;
}

async function configureInteractionEndpoint({ bearer, env = process.env, fetcher = fetch } = {}) {
  const botToken = envText('DISCORD_BOT_TOKEN', env);
  const authCandidates = [
    botToken ? 'Bot ' + botToken : '',
    bearer ? 'Bearer ' + bearer : '',
  ].filter(Boolean);

  let lastError = null;
  for (const auth of authCandidates) {
    try {
      const application = await discordApi('/applications/@me', {
        method: 'PATCH',
        auth,
        body: { interactions_endpoint_url: INTERACTIONS_URL },
        fetcher,
      });
      return { configured: application?.interactions_endpoint_url === INTERACTIONS_URL, via: auth.startsWith('Bot ') ? 'bot' : 'client-credentials' };
    } catch (error) {
      lastError = error;
    }
  }
  return { configured: false, error: cleanText(lastError?.message || 'Discord did not accept the interaction endpoint update.', 300) };
}

export async function ensureDiscordInteractionsBootstrap({ env = process.env, fetcher = fetch } = {}) {
  const clientId = envText('DISCORD_CLIENT_ID', env) || envText('DISCORD_APPLICATION_ID', env);
  const clientSecret = envText('DISCORD_CLIENT_SECRET', env);
  if (!clientId || !clientSecret) return { ok: false, reason: 'oauth-not-configured' };
  if (!(await kvClaimBootstrap({ env, fetcher }))) return { ok: true, skipped: true, reason: 'recent-bootstrap' };

  try {
    const { token } = await discordClientCredentials({ env, fetcher });
    const application = await discordApplication({ env, fetcher });
    const commands = await registerCommands(clientId, token, fetcher);
    const endpoint = await configureInteractionEndpoint({ bearer: token, env, fetcher });
    return {
      ok: endpoint.configured,
      applicationId: String(application?.id || clientId),
      commands: commands.length,
      endpointConfigured: endpoint.configured,
      endpointAuth: endpoint.via || null,
      endpointError: endpoint.error || null,
    };
  } catch (error) {
    return { ok: false, reason: cleanText(error?.message || error, 300) };
  }
}

async function bridge(body, { env = process.env, fetcher = fetch, timeoutMs = 55_000 } = {}) {
  const botKey = envText('STELLAR_DISCORD_BOT_KEY', env);
  if (!botKey) throw new Error('The Stellar Discord bridge is not configured.');
  const apiUrl = envText('STELLAR_DEBUG_API_URL', env) || SITE_URL + '/api/generate';
  const response = await fetcher(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Stellar-Bot-Key': botKey },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(cleanText(data?.error?.message || data?.error || data?.message || 'Stellar Discord bridge failed.', 500));
  return data;
}

async function editOriginal(interaction, payload, { fetcher = fetch } = {}) {
  const applicationId = String(interaction?.application_id || '').trim();
  const token = String(interaction?.token || '').trim();
  if (!applicationId || !token) return false;
  const response = await fetcher(DISCORD_API + '/webhooks/' + encodeURIComponent(applicationId) + '/' + encodeURIComponent(token) + '/messages/@original', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, allowed_mentions: { parse: [] } }),
    signal: AbortSignal.timeout(10000),
  });
  return response.ok;
}

async function botRequest(path, options = {}) {
  const token = envText('DISCORD_BOT_TOKEN', options.env || process.env);
  if (!token) throw new Error('Discord role/channel automation is waiting for the bot token on the cloud runtime.');
  return discordApi(path, { ...options, auth: 'Bot ' + token });
}

async function ensureGuildRole(guildId, roleName, options = {}) {
  const roles = await botRequest('/guilds/' + guildId + '/roles', options);
  const existing = Array.isArray(roles) ? roles.find((role) => role?.name === roleName) : null;
  if (existing) return existing;
  return botRequest('/guilds/' + guildId + '/roles', { ...options, method: 'POST', body: { name: roleName, reason: 'Stellar AI role sync' } });
}

async function syncRoles(interaction, status, options = {}) {
  const guildId = String(interaction?.guild_id || '');
  const userId = interactionUserId(interaction);
  if (!guildId || !userId) return { synced: false, reason: 'guild-required' };
  if (!envText('DISCORD_BOT_TOKEN', options.env || process.env)) return { synced: false, reason: 'bot-token-not-cloud' };

  const targetName = PLAN_ROLE_NAMES[status?.plan] || PLAN_ROLE_NAMES.free;
  const planRoles = [];
  for (const name of Object.values(PLAN_ROLE_NAMES)) planRoles.push(await ensureGuildRole(guildId, name, options));
  const passRole = await ensureGuildRole(guildId, SERVER_PASS_ROLE, options);
  const target = planRoles.find((role) => role.name === targetName);
  const member = await botRequest('/guilds/' + guildId + '/members/' + userId, options);
  const memberRoleIds = new Set(Array.isArray(member?.roles) ? member.roles.map(String) : []);

  for (const role of planRoles) {
    if (role.id === target.id && !memberRoleIds.has(String(role.id))) {
      await botRequest('/guilds/' + guildId + '/members/' + userId + '/roles/' + role.id, { ...options, method: 'PUT' });
    } else if (role.id !== target.id && memberRoleIds.has(String(role.id))) {
      await botRequest('/guilds/' + guildId + '/members/' + userId + '/roles/' + role.id, { ...options, method: 'DELETE' });
    }
  }

  if (status?.serverPassActive && !memberRoleIds.has(String(passRole.id))) {
    await botRequest('/guilds/' + guildId + '/members/' + userId + '/roles/' + passRole.id, { ...options, method: 'PUT' });
  } else if (!status?.serverPassActive && memberRoleIds.has(String(passRole.id))) {
    await botRequest('/guilds/' + guildId + '/members/' + userId + '/roles/' + passRole.id, { ...options, method: 'DELETE' });
  }
  return { synced: true, role: targetName };
}

async function createSupportTicket(interaction, issue, options = {}) {
  const guildId = String(interaction?.guild_id || '');
  const userId = interactionUserId(interaction);
  if (!guildId || !userId || !envText('DISCORD_BOT_TOKEN', options.env || process.env)) return null;

  const channels = await botRequest('/guilds/' + guildId + '/channels', options);
  const existing = Array.isArray(channels) ? channels.find((channel) =>
    String(channel?.topic || '').includes('stellar-ticket-owner:' + userId) && !String(channel?.name || '').startsWith('closed-')) : null;
  if (existing) return { channelId: existing.id, existing: true };

  const supportRole = await ensureGuildRole(guildId, SUPPORT_ROLE, options);
  const everyoneRoleId = guildId;
  const bot = await botRequest('/users/@me', options);
  let category = Array.isArray(channels) ? channels.find((channel) => channel?.type === 4 && channel?.name === '🛟 SUPPORT') : null;
  if (!category) {
    category = await botRequest('/guilds/' + guildId + '/channels', {
      ...options,
      method: 'POST',
      body: { name: '🛟 SUPPORT', type: 4 },
    });
  }
  const slug = cleanText(interaction?.member?.user?.username || 'member', 24).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'member';
  const channel = await botRequest('/guilds/' + guildId + '/channels', {
    ...options,
    method: 'POST',
    body: {
      name: ('ticket-' + slug + '-' + userId.slice(-4)).slice(0, 90),
      type: 0,
      parent_id: category.id,
      topic: 'stellar-ticket-owner:' + userId,
      permission_overwrites: [
        { id: everyoneRoleId, type: 0, deny: '1024', allow: '0' },
        { id: userId, type: 1, allow: String(1024 + 2048 + 65536 + 32768 + 16384), deny: '0' },
        { id: supportRole.id, type: 0, allow: String(1024 + 2048 + 65536 + 8192), deny: '0' },
        { id: bot.id, type: 1, allow: String(1024 + 2048 + 65536 + 16), deny: '0' },
      ],
    },
  });
  await botRequest('/channels/' + channel.id + '/messages', {
    ...options,
    method: 'POST',
    body: { content: '<@' + userId + '> Thanks — your Stellar support ticket is open.\n\n**Issue:** ' + cleanText(issue, 500), allowed_mentions: { parse: [] } },
  });
  return { channelId: channel.id, existing: false };
}

async function closeSupportTicket(interaction, options = {}) {
  const channelId = String(interaction?.channel_id || '');
  const userId = interactionUserId(interaction);
  if (!channelId || !envText('DISCORD_BOT_TOKEN', options.env || process.env)) return null;
  const channel = await botRequest('/channels/' + channelId, options);
  const owner = String(channel?.topic || '').match(/stellar-ticket-owner:(\d{5,32})/)?.[1] || '';
  if (!owner) throw new Error('Run /ticket-close inside a Stellar support ticket.');
  if (owner !== userId && !hasPermission(interaction, PERMISSION_MANAGE_CHANNELS)) {
    throw new Error('Only the ticket owner or a server moderator can close this ticket.');
  }
  await botRequest('/channels/' + channelId + '/permissions/' + owner, {
    ...options,
    method: 'PUT',
    body: { type: 1, allow: String(1024 + 65536), deny: '2048' },
  });
  if (!String(channel?.name || '').startsWith('closed-')) {
    await botRequest('/channels/' + channelId, { ...options, method: 'PATCH', body: { name: ('closed-' + channel.name).slice(0, 100) } });
  }
  return { closed: true };
}

export async function processDiscordInteraction(interaction, { env = process.env, fetcher = fetch } = {}) {
  const command = String(interaction?.data?.name || '').trim().toLowerCase();
  const userId = interactionUserId(interaction);
  const guildId = String(interaction?.guild_id || '').trim();
  const common = { env, fetcher };

  try {
    if (command === 'debug') {
      const code = cleanText(optionValue(interaction, 'code'), 6000);
      if (!code) throw new Error('Paste a script or error log to debug.');
      const result = await bridge({
        prompt: 'Fix this error/script: ' + code,
        discordUserId: userId,
        discordGuildId: guildId,
      }, common);
      const language = result?.language === 'luau' ? 'luau' : 'lua';
      const repaired = cleanText(result?.code, 3000);
      const summary = cleanText(result?.summary || result?.answer || 'Repair generated.', 900);
      const content = repaired
        ? '**Stellar AI repair**\n\n\\`\\`\\`' + language + '\n' + repaired.replaceAll('\\`\\`\\`', '\\`\u200b\\`\\`') + '\n\\`\\`\\`\n\n' + summary
        : '**Stellar AI repair**\n\n' + cleanText(result?.answer || summary, 3600);
      await editOriginal(interaction, { content: content.slice(0, 3900) }, common);
      return;
    }

    if (command === 'serverpass') {
      const action = String(optionValue(interaction, 'action') || 'status');
      if (action === 'activate') {
        const canManage = hasPermission(interaction, PERMISSION_MANAGE_GUILD);
        const result = await bridge({
          action: 'activate-server-pass',
          discordUserId: userId,
          discordGuildId: guildId,
          discordCanManageGuild: canManage,
        }, common);
        const roleSync = await syncRoles(interaction, { linked: true, plan: result?.plan || 'free', serverPassActive: true }, common).catch(() => ({ synced: false }));
        await editOriginal(interaction, {
          content: roleSync.synced
            ? '✅ Server Pass is active for this Discord server and your Stellar roles are synced.'
            : '✅ Server Pass is active for this Discord server. Core paid /debug access is live 24/7; role styling will sync when cloud role management is available.',
        }, common);
        return;
      }
      const result = await bridge({ action: 'account-status', discordUserId: userId, discordGuildId: guildId }, common);
      const text = !result?.linked
        ? '🔗 Connect Discord to your Stellar account first: ' + SITE_URL + '/api/discord-oauth'
        : result?.serverPassActive
          ? '✅ Server Pass is active for this Discord server.'
          : result?.serverPassPurchased
            ? '🟣 Your account has Server Pass. If you manage this server, run **/serverpass action:Activate this server**.'
            : 'ℹ️ No active Server Pass purchase is linked to this Stellar account. ' + SITE_URL + '/server-pass';
      await editOriginal(interaction, { content: text }, common);
      return;
    }

    if (command === 'sync') {
      const result = await bridge({ action: 'account-status', discordUserId: userId, discordGuildId: guildId }, common);
      if (!result?.linked) {
        await editOriginal(interaction, { content: '🔗 Connect Discord to your Stellar account first: ' + SITE_URL + '/api/discord-oauth' }, common);
        return;
      }
      const roleSync = await syncRoles(interaction, result, common).catch(() => ({ synced: false }));
      const plan = PLAN_ROLE_NAMES[result?.plan] || PLAN_ROLE_NAMES.free;
      await editOriginal(interaction, {
        content: roleSync.synced
          ? '✅ Synced **' + plan + '**' + (result?.serverPassActive ? ' · 🎮 Server Pass active' : '') + '.'
          : '✅ Stellar account verified as **' + plan + '**' + (result?.serverPassActive ? ' · 🎮 Server Pass active' : '') + '. Core Discord access is synced server-side; visual role sync is waiting for cloud role-management credentials.',
      }, common);
      return;
    }

    if (command === 'support') {
      const issue = cleanText(optionValue(interaction, 'issue'), 500);
      const ticket = await createSupportTicket(interaction, issue, common).catch(() => null);
      await editOriginal(interaction, {
        content: ticket?.channelId
          ? (ticket.existing ? '🎫 You already have an open ticket: <#' + ticket.channelId + '>' : '🎫 Private support ticket created: <#' + ticket.channelId + '>')
          : '🎫 Stellar support is available 24/7 at ' + SITE_URL + '/support\n\n**Your issue:** ' + (issue || 'No issue text supplied.') + '\nThe web support path stays available even while the Discord gateway PC is offline.',
      }, common);
      return;
    }

    if (command === 'ticket-close') {
      const result = await closeSupportTicket(interaction, common).catch(() => null);
      await editOriginal(interaction, {
        content: result?.closed
          ? '✅ Ticket closed. The history is preserved.'
          : 'ℹ️ This command needs Discord channel-management credentials on the cloud runtime. You can still use ' + SITE_URL + '/support while the gateway host is offline.',
      }, common);
      return;
    }

    if (command === 'stellar-status') {
      const started = Date.now();
      const response = await fetcher(SITE_URL + '/', { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'Stellar-Discord-Interactions/1.0' } });
      const healthy = response.ok;
      await editOriginal(interaction, {
        content: (healthy ? '🟢' : '🟠') + ' **Stellar status**\nWeb/API: **' + (healthy ? 'online' : 'degraded') + '**\nServerless Discord interactions: **online**\nResponse: **' + (Date.now() - started) + 'ms**',
      }, common);
      return;
    }

    if (command === 'stellar-setup') {
      if (!hasPermission(interaction, PERMISSION_ADMINISTRATOR)) throw new Error('Administrator permission is required for /stellar-setup.');
      const mode = String(optionValue(interaction, 'mode') || 'server-pass');
      await editOriginal(interaction, {
        content: '✅ Stellar serverless commands are already active for this guild in **' + (mode === 'community' ? 'community' : 'Server Pass') + '** mode. Core /debug, /serverpass, /sync, /support and /stellar-status do not require the T10 gateway to stay online. Full automatic channel/role layout still uses Discord bot management permissions when available.',
      }, common);
      return;
    }

    await editOriginal(interaction, { content: 'ℹ️ This Stellar command is not available on the serverless fallback yet.' }, common);
  } catch (error) {
    await editOriginal(interaction, {
      content: '⚠️ ' + cleanText(error?.message || 'Stellar could not complete that Discord command right now.', 1500) + '\n' + SITE_URL + '/support',
    }, { fetcher });
  }
}

export { COMMANDS, EPHEMERAL, INTERACTIONS_URL };
