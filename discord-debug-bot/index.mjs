import {
  ChannelType,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  PermissionFlagsBits,
  REST,
  Routes,
} from 'discord.js';
import { commandsJson } from './commands.mjs';

const token = process.env.DISCORD_BOT_TOKEN;
const bridgeKey = process.env.STELLAR_DISCORD_BOT_KEY;
const applicationId = process.env.DISCORD_APPLICATION_ID || '';
const guildId = process.env.DISCORD_GUILD_ID || '';
const apiUrl = process.env.STELLAR_DEBUG_API_URL || 'https://trystellarai.com/api/generate';
const siteUrl = 'https://trystellarai.com';

if (!token) throw new Error('DISCORD_BOT_TOKEN is required.');
if (!bridgeKey) throw new Error('STELLAR_DISCORD_BOT_KEY is required.');
if (!applicationId) throw new Error('DISCORD_APPLICATION_ID is required.');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const cooldowns = new Map();
const inFlight = new Set();
const COOLDOWN_MS = 15_000;
const PLAN_ROLE_NAMES = Object.freeze({
  free: 'Stellar Free',
  starter: 'Stellar Starter',
  plus: 'Stellar Plus',
  pro: 'Stellar Pro',
});
const SERVER_PASS_ROLE = 'Server Pass';
const SUPPORT_ROLE = 'Stellar Support';
const FENCE = String.fromCharCode(96).repeat(3);

function cleanForCodeBlock(value) {
  return String(value || '').replaceAll(FENCE, String.fromCharCode(96) + '\u200b' + String.fromCharCode(96).repeat(2));
}

function truncate(value, max) {
  const text = String(value || '');
  if (text.length <= max) return text;
  return text.slice(0, Math.max(0, max - 16)).trimEnd() + '\n… truncated';
}

function getErrorMessage(payload, status) {
  if (typeof payload?.error === 'string') return payload.error;
  if (typeof payload?.error?.message === 'string') return payload.error.message;
  return 'Stellar AI request failed (' + status + ').';
}

function safeChannelSlug(value, fallback = 'member') {
  const clean = String(value || '').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return (clean || fallback).slice(0, 32);
}

function botCan(guild, permission) {
  return Boolean(guild?.members?.me?.permissions?.has(permission));
}

async function bridge(body, timeoutMs = 12_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Stellar-Bot-Key': bridgeKey,
      },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(getErrorMessage(payload, response.status));
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(token);
  const collectionRoute = guildId
    ? Routes.applicationGuildCommands(applicationId, guildId)
    : Routes.applicationCommands(applicationId);
  const existing = await rest.get(collectionRoute);
  const byName = new Map((Array.isArray(existing) ? existing : []).map((item) => [item?.name, item]));

  for (const command of commandsJson) {
    const previous = byName.get(command.name);
    if (previous?.id) {
      const commandRoute = guildId
        ? Routes.applicationGuildCommand(applicationId, guildId, previous.id)
        : Routes.applicationCommand(applicationId, previous.id);
      await rest.patch(commandRoute, { body: command });
    } else {
      await rest.post(collectionRoute, { body: command });
    }
  }
}

async function ensureRole(guild, name) {
  let role = guild.roles.cache.find((item) => item.name === name);
  if (role) return role;
  if (!botCan(guild, PermissionFlagsBits.ManageRoles)) throw new Error('Give the Stellar bot Manage Roles permission first.');
  role = await guild.roles.create({ name, reason: 'Stellar AI Discord setup' });
  return role;
}

async function ensureCategory(guild, name, permissionOverwrites = undefined) {
  let category = guild.channels.cache.find((item) => item.type === ChannelType.GuildCategory && item.name === name);
  if (category) return category;
  if (!botCan(guild, PermissionFlagsBits.ManageChannels)) throw new Error('Give the Stellar bot Manage Channels permission first.');
  category = await guild.channels.create({
    name,
    type: ChannelType.GuildCategory,
    permissionOverwrites,
    reason: 'Stellar AI Discord setup',
  });
  return category;
}

async function ensureTextChannel(guild, category, name, topic = '', permissionOverwrites = undefined) {
  let channel = guild.channels.cache.find((item) => item.type === ChannelType.GuildText && item.name === name && item.parentId === category.id);
  if (channel) return channel;
  if (!botCan(guild, PermissionFlagsBits.ManageChannels)) throw new Error('Give the Stellar bot Manage Channels permission first.');
  channel = await guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: category.id,
    topic: topic.slice(0, 1024) || undefined,
    permissionOverwrites,
    reason: 'Stellar AI Discord setup',
  });
  return channel;
}

async function buildGuildStructure(guild, mode = 'community') {
  if (!botCan(guild, PermissionFlagsBits.ManageChannels) || !botCan(guild, PermissionFlagsBits.ManageRoles)) {
    throw new Error('The Stellar bot needs Manage Channels and Manage Roles before it can build the Discord structure.');
  }

  const roles = {};
  for (const roleName of [...Object.values(PLAN_ROLE_NAMES), SERVER_PASS_ROLE, SUPPORT_ROLE]) {
    roles[roleName] = await ensureRole(guild, roleName);
  }

  const everyone = guild.roles.everyone.id;
  const botId = guild.members.me.id;
  const supportRoleId = roles[SUPPORT_ROLE].id;
  const staffOverwrites = [
    { id: everyone, deny: [PermissionFlagsBits.ViewChannel] },
    { id: supportRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
    { id: botId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] },
  ];
  const readOnlyOverwrites = [
    { id: everyone, deny: [PermissionFlagsBits.SendMessages], allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory] },
    { id: supportRoleId, allow: [PermissionFlagsBits.SendMessages] },
    { id: botId, allow: [PermissionFlagsBits.SendMessages] },
  ];

  if (mode === 'server-pass') {
    const serverPass = await ensureCategory(guild, '🎮 STELLAR SERVER PASS');
    await ensureTextChannel(guild, serverPass, 'stellar-debug', 'Use /debug for focused FiveM or Roblox errors. Never paste passwords, API keys, database credentials or payment details.');
    await ensureTextChannel(guild, serverPass, 'server-pass', 'Use /serverpass to check or activate the paid guild entitlement. Use /sync to sync the linked Stellar plan role.', readOnlyOverwrites);
    await ensureTextChannel(guild, serverPass, 'stellar-support', 'Use /support to open a private Stellar support ticket.', readOnlyOverwrites);
    await ensureTextChannel(guild, serverPass, 'stellar-status', 'Use /stellar-status to check Stellar bot and web/API health.', readOnlyOverwrites);
    return { roles: Object.keys(roles).length, categories: 1, channels: 4, mode: 'server-pass' };
  }

  const start = await ensureCategory(guild, '👋 START HERE');
  await ensureTextChannel(guild, start, 'welcome', 'Welcome to Stellar AI. Start here, then use /sync to connect your Stellar plan role.', readOnlyOverwrites);
  await ensureTextChannel(guild, start, 'rules', 'Community rules, safety and acceptable use.', readOnlyOverwrites);
  await ensureTextChannel(guild, start, 'how-to-use-stellar', 'Use /debug for focused FiveM or Roblox errors. Never paste passwords, API keys or payment details.', readOnlyOverwrites);
  await ensureTextChannel(guild, start, 'plans', 'Stellar plans and Server Pass information.', readOnlyOverwrites);

  const ai = await ensureCategory(guild, '🤖 STELLAR AI');
  await ensureTextChannel(guild, ai, 'stellar-chat', 'General Stellar AI community discussion.');
  await ensureTextChannel(guild, ai, 'script-help', 'Script planning, debugging and code-review discussion.');
  await ensureTextChannel(guild, ai, 'fivem-help', 'QBCore, ESX, ox_lib and FiveM help.');
  await ensureTextChannel(guild, ai, 'roblox-help', 'Roblox Luau, Studio and game-system help.');

  const support = await ensureCategory(guild, '🛟 SUPPORT');
  await ensureTextChannel(guild, support, 'open-a-ticket', 'Use /support issue:<what you need help with> to create a private support ticket.', readOnlyOverwrites);
  await ensureTextChannel(guild, support, 'bug-reports', 'Report reproducible Stellar bugs. Do not post secrets or private account data.');

  const updates = await ensureCategory(guild, '📢 UPDATES');
  await ensureTextChannel(guild, updates, 'announcements', 'Official Stellar announcements.', readOnlyOverwrites);
  await ensureTextChannel(guild, updates, 'changelog', 'Product and bot changes.', readOnlyOverwrites);
  await ensureTextChannel(guild, updates, 'status', 'Run /stellar-status for the latest bot and Stellar web health.', readOnlyOverwrites);

  const community = await ensureCategory(guild, '💬 COMMUNITY');
  await ensureTextChannel(guild, community, 'general', 'General community chat.');
  await ensureTextChannel(guild, community, 'showcase', 'Share projects built or repaired with Stellar.');
  await ensureTextChannel(guild, community, 'ideas', 'Product, FiveM, Roblox and Discord ideas.');

  const staff = await ensureCategory(guild, '🔒 STAFF', staffOverwrites);
  await ensureTextChannel(guild, staff, 'staff-logs', 'Private staff operations log.', staffOverwrites);
  await ensureTextChannel(guild, staff, 'server-pass-activations', 'Verified Server Pass activation log.', staffOverwrites);
  await ensureTextChannel(guild, staff, 'bot-errors', 'Bot errors without secrets or credentials.', staffOverwrites);

  return { roles: Object.keys(roles).length, categories: 6, channels: 19, mode: 'community' };
}

async function logToGuild(guild, channelName, message) {
  try {
    const channel = guild?.channels?.cache?.find((item) => item.name === channelName && item.isTextBased?.());
    if (!channel) return false;
    await channel.send({ content: truncate(message, 1800), allowedMentions: { parse: [] } });
    return true;
  } catch {
    return false;
  }
}

async function syncMemberRoles(interaction, status = null) {
  const guild = interaction.guild;
  if (!guild) throw new Error('Run /sync inside a Discord server.');
  if (!botCan(guild, PermissionFlagsBits.ManageRoles)) throw new Error('The Stellar bot needs Manage Roles permission before it can sync plan roles.');

  const result = status || await bridge({
    action: 'account-status',
    discordUserId: interaction.user.id,
    discordGuildId: interaction.guildId || '',
  });
  if (!result.linked) return { ...result, synced: false };

  const member = await guild.members.fetch(interaction.user.id);
  const targetRoleName = PLAN_ROLE_NAMES[result.plan] || PLAN_ROLE_NAMES.free;
  const planRoles = [];
  for (const roleName of Object.values(PLAN_ROLE_NAMES)) planRoles.push(await ensureRole(guild, roleName));
  const serverPassRole = await ensureRole(guild, SERVER_PASS_ROLE);
  const target = planRoles.find((role) => role.name === targetRoleName);

  const removeIds = planRoles.filter((role) => role.id !== target.id && member.roles.cache.has(role.id)).map((role) => role.id);
  if (removeIds.length) await member.roles.remove(removeIds, 'Stellar plan role sync');
  if (!member.roles.cache.has(target.id)) await member.roles.add(target, 'Stellar plan role sync');

  if (result.serverPassActive && !member.roles.cache.has(serverPassRole.id)) {
    await member.roles.add(serverPassRole, 'Verified Stellar Server Pass');
  } else if (!result.serverPassActive && member.roles.cache.has(serverPassRole.id)) {
    await member.roles.remove(serverPassRole, 'Server Pass is not active for this guild');
  }

  return { ...result, synced: true, role: targetRoleName };
}

async function handleDebug(interaction) {
  const userId = interaction.user.id;
  const now = Date.now();
  const retryAt = cooldowns.get(userId) || 0;

  if (retryAt > now) {
    const seconds = Math.ceil((retryAt - now) / 1000);
    await interaction.reply({ content: '⚡ Give Stellar ' + seconds + 's before another /debug request.', ephemeral: true });
    return;
  }
  if (inFlight.has(userId)) {
    await interaction.reply({ content: '⚡ Your previous /debug request is still running.', ephemeral: true });
    return;
  }

  const inputCode = interaction.options.getString('code', true).trim();
  if (!inputCode) {
    await interaction.reply({ content: 'Paste a script or error log to debug.', ephemeral: true });
    return;
  }

  cooldowns.set(userId, now + COOLDOWN_MS);
  inFlight.add(userId);
  await interaction.deferReply();

  try {
    const payload = await bridge({
      prompt: 'Fix this error/script: ' + inputCode,
      discordUserId: interaction.user.id,
      discordGuildId: interaction.guildId || '',
    }, 55_000);

    const language = payload.language === 'luau' ? 'luau' : 'lua';
    const repairedCode = truncate(cleanForCodeBlock(payload.code), 3300);
    const summary = truncate(payload.summary || payload.answer || 'Repair generated.', 900);
    const description = repairedCode
      ? FENCE + language + '\n' + repairedCode + '\n' + FENCE
      : truncate(cleanForCodeBlock(payload.answer || summary), 3800);

    const embed = new EmbedBuilder()
      .setColor(0x8A2BE2)
      .setTitle('✦ Stellar AI Script Repair')
      .setURL(siteUrl)
      .setDescription(description)
      .addFields({ name: 'What Stellar found', value: summary || 'A corrected version is shown above.' })
      .setFooter({ text: 'Generated with Stellar AI | Free /debug: 2 repairs/day · Server Pass supports an activated guild' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
  } catch (error) {
    const message = error?.name === 'AbortError'
      ? 'Stellar AI took too long to respond. Try a smaller script or error excerpt.'
      : truncate(error?.message || 'Unable to process that script right now.', 1800);
    await interaction.editReply({
      content: '⚠️ ' + message + '\nTry directly at ' + siteUrl + '/app?mode=debug',
      allowedMentions: { parse: [] },
    });
    await logToGuild(interaction.guild, 'bot-errors', '/debug error: ' + message);
  } finally {
    inFlight.delete(userId);
  }
}

async function handleSync(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const result = await syncMemberRoles(interaction);
  if (!result.linked) {
    await interaction.editReply('🔗 Connect Discord to your Stellar account first: ' + siteUrl + '/api/discord-oauth\nThen run **/sync** again.');
    return;
  }
  const pass = result.serverPassActive ? ' · 🎮 Server Pass active' : '';
  await interaction.editReply('✅ Synced **' + result.role + '**' + pass + '.');
}

async function handleServerPass(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const action = interaction.options.getString('action') || 'status';
  const canManage = Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)
    || interaction.memberPermissions?.has(PermissionFlagsBits.Administrator));

  if (action === 'activate') {
    const result = await bridge({
      action: 'activate-server-pass',
      discordUserId: interaction.user.id,
      discordGuildId: interaction.guildId || '',
      discordCanManageGuild: canManage,
    });
    await syncMemberRoles(interaction, { linked: true, plan: result.plan || 'free', serverPassActive: true, serverPassPurchased: true });
    await logToGuild(interaction.guild, 'server-pass-activations', '✅ Server Pass activated for guild ' + interaction.guildId + ' by Discord user ' + interaction.user.id + '.');
    await interaction.editReply('✅ **Server Pass is active for this Discord server.** /debug now uses the paid guild entitlement while normal safety and abuse controls stay enabled.');
    return;
  }

  const result = await bridge({
    action: 'account-status',
    discordUserId: interaction.user.id,
    discordGuildId: interaction.guildId || '',
  });
  if (!result.linked) {
    await interaction.editReply('🔗 Connect Discord to the Stellar account that bought Server Pass first: ' + siteUrl + '/api/discord-oauth');
  } else if (result.serverPassActive) {
    await interaction.editReply('✅ Server Pass is active for this Discord server.');
  } else if (result.serverPassPurchased) {
    await interaction.editReply('🟣 Your Stellar account has Server Pass. If you manage this server, run **/serverpass action:Activate this server**.');
  } else {
    await interaction.editReply('ℹ️ No active Server Pass purchase is linked to this Stellar account. ' + siteUrl + '/server-pass');
  }
}

async function handleSupport(interaction) {
  if (!interaction.guild) {
    await interaction.reply({ content: 'Open a support ticket from inside the Stellar Discord server.', ephemeral: true });
    return;
  }
  if (!botCan(interaction.guild, PermissionFlagsBits.ManageChannels)) {
    await interaction.reply({ content: '⚠️ The Stellar bot needs Manage Channels before private tickets can be created.', ephemeral: true });
    return;
  }

  const existing = interaction.guild.channels.cache.find((channel) =>
    channel.type === ChannelType.GuildText && String(channel.topic || '').includes('stellar-ticket-owner:' + interaction.user.id) && !String(channel.name).startsWith('closed-'));
  if (existing) {
    await interaction.reply({ content: '🎫 You already have an open ticket: <#' + existing.id + '>', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  const supportRole = await ensureRole(interaction.guild, SUPPORT_ROLE);
  let category = interaction.guild.channels.cache.find((channel) => channel.type === ChannelType.GuildCategory && channel.name === '🛟 SUPPORT');
  if (!category) category = await ensureCategory(interaction.guild, '🛟 SUPPORT');

  const channel = await interaction.guild.channels.create({
    name: 'ticket-' + safeChannelSlug(interaction.user.username) + '-' + interaction.user.id.slice(-4),
    type: ChannelType.GuildText,
    parent: category.id,
    topic: 'stellar-ticket-owner:' + interaction.user.id,
    permissionOverwrites: [
      { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] },
      { id: supportRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages] },
      { id: interaction.guild.members.me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] },
    ],
    reason: 'Stellar support ticket',
  });

  const issue = interaction.options.getString('issue', true).trim();
  await channel.send({
    content: '🎫 <@' + interaction.user.id + '> opened a Stellar support ticket.\n\n**Issue:** ' + truncate(issue, 500) + '\n\nUse **/ticket-close** here when the issue is resolved.',
    allowedMentions: { users: [interaction.user.id], roles: [] },
  });
  await interaction.editReply('✅ Private support ticket created: <#' + channel.id + '>');
}

async function handleTicketClose(interaction) {
  const channel = interaction.channel;
  const match = String(channel?.topic || '').match(/stellar-ticket-owner:(\d{5,32})/);
  if (!interaction.guild || !channel || !match) {
    await interaction.reply({ content: 'This channel is not a Stellar support ticket.', ephemeral: true });
    return;
  }
  const ownerId = match[1];
  const supportRole = interaction.guild.roles.cache.find((role) => role.name === SUPPORT_ROLE);
  const canClose = interaction.user.id === ownerId
    || Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels))
    || Boolean(supportRole && interaction.member?.roles?.cache?.has?.(supportRole.id));
  if (!canClose) {
    await interaction.reply({ content: 'Only the ticket opener or Stellar support staff can close this ticket.', ephemeral: true });
    return;
  }

  await interaction.reply({ content: '🔒 Ticket closed. Staff can keep the transcript for support history.', ephemeral: true });
  await channel.permissionOverwrites.edit(ownerId, { SendMessages: false }, { reason: 'Stellar support ticket closed' });
  if (!String(channel.name).startsWith('closed-')) await channel.setName(('closed-' + channel.name).slice(0, 100), 'Stellar support ticket closed');
}

async function handleStatus(interaction) {
  await interaction.deferReply();
  const started = Date.now();
  let web = false;
  let statusCode = 0;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(siteUrl + '/api/get-plan?stats=public', { signal: controller.signal, headers: { 'User-Agent': 'StellarDiscordBot/1.1' } });
    clearTimeout(timeout);
    statusCode = response.status;
    web = response.ok;
  } catch {
    web = false;
  }
  const latency = Date.now() - started;
  const embed = new EmbedBuilder()
    .setColor(web ? 0x57F287 : 0xED4245)
    .setTitle('✦ Stellar AI Status')
    .addFields(
      { name: 'Discord bot', value: '🟢 Online', inline: true },
      { name: 'Stellar web/API', value: web ? '🟢 Online · ' + latency + 'ms' : '🔴 Unavailable · HTTP ' + (statusCode || '—'), inline: true },
      { name: 'Bot uptime', value: Math.floor(process.uptime() / 60) + ' minutes', inline: true },
    )
    .setURL(siteUrl + '/status')
    .setTimestamp();
  await interaction.editReply({ embeds: [embed] });
}

async function handleSetup(interaction) {
  if (!interaction.guild || !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: 'Administrator permission is required for /stellar-setup.', ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });
  const requestedMode = interaction.options.getString('mode');
  const mode = requestedMode || (guildId && interaction.guildId === guildId ? 'community' : 'server-pass');
  const result = await buildGuildStructure(interaction.guild, mode);
  const label = result.mode === 'community' ? 'full community hub' : 'Server Pass setup';
  await interaction.editReply('✅ Stellar **' + label + '** is ready: **' + result.roles + ' roles, ' + result.categories + ' categories, ' + result.channels + ' channels** checked/created. Existing matching channels were kept — nothing was deleted.');
}

client.once(Events.ClientReady, async (readyClient) => {
  try {
    await registerCommands();
    console.log('Stellar Discord bot ready as ' + readyClient.user.tag);
  } catch (error) {
    console.error('Could not register Stellar Discord commands:', error);
  }

  if (guildId) {
    try {
      const homeGuild = readyClient.guilds.cache.get(guildId) || await readyClient.guilds.fetch(guildId);
      const result = await buildGuildStructure(homeGuild, 'community');
      console.log('Stellar Discord structure checked: ' + result.roles + ' roles, ' + result.categories + ' categories, ' + result.channels + ' channels.');
    } catch (error) {
      console.error('Could not auto-check the Stellar Discord structure:', error?.message || error);
    }
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  try {
    if (interaction.commandName === 'debug') return await handleDebug(interaction);
    if (interaction.commandName === 'sync') return await handleSync(interaction);
    if (interaction.commandName === 'serverpass') return await handleServerPass(interaction);
    if (interaction.commandName === 'support') return await handleSupport(interaction);
    if (interaction.commandName === 'ticket-close') return await handleTicketClose(interaction);
    if (interaction.commandName === 'stellar-status') return await handleStatus(interaction);
    if (interaction.commandName === 'stellar-setup') return await handleSetup(interaction);
  } catch (error) {
    const message = truncate(error?.message || 'Stellar Discord command failed.', 1500);
    console.error('Discord /' + interaction.commandName + ' failed:', message);
    await logToGuild(interaction.guild, 'bot-errors', '/' + interaction.commandName + ' error: ' + message);
    const reply = '⚠️ ' + message;
    if (interaction.deferred || interaction.replied) await interaction.editReply({ content: reply, embeds: [] }).catch(() => {});
    else await interaction.reply({ content: reply, ephemeral: true }).catch(() => {});
  }
});

client.on(Events.Error, (error) => {
  console.error('Discord client error:', error?.message || error);
});

await client.login(token);
