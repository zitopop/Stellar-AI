import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

export const commandBuilders = [
  new SlashCommandBuilder()
    .setName('debug')
    .setDescription('Fix a broken FiveM or Roblox Lua/Luau script with Stellar AI')
    .addStringOption((option) => option
      .setName('code')
      .setDescription('Paste your broken script or F8/Output error log')
      .setRequired(true)
      .setMaxLength(6000)),
  new SlashCommandBuilder()
    .setName('sync')
    .setDescription('Sync your Stellar plan and Server Pass roles in this Discord'),
  new SlashCommandBuilder()
    .setName('serverpass')
    .setDescription('Activate or check Server Pass for this Discord server')
    .addStringOption((option) => option
      .setName('action')
      .setDescription('What you want to do')
      .setRequired(false)
      .addChoices(
        { name: 'Activate this server', value: 'activate' },
        { name: 'Check status', value: 'status' },
      )),
  new SlashCommandBuilder()
    .setName('support')
    .setDescription('Open a private Stellar support ticket')
    .addStringOption((option) => option
      .setName('issue')
      .setDescription('Briefly describe what you need help with')
      .setRequired(true)
      .setMaxLength(500)),
  new SlashCommandBuilder()
    .setName('ticket-close')
    .setDescription('Close the current Stellar support ticket'),
  new SlashCommandBuilder()
    .setName('stellar-status')
    .setDescription('Check the Stellar bot and web service status'),
  new SlashCommandBuilder()
    .setName('stellar-setup')
    .setDescription('Create a safe Stellar Discord structure without deleting existing channels')
    .addStringOption((option) => option
      .setName('mode')
      .setDescription('Choose a full Stellar community hub or a smaller Server Pass setup')
      .setRequired(false)
      .addChoices(
        { name: 'Server Pass only', value: 'server-pass' },
        { name: 'Full community hub', value: 'community' },
      ))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
];

export const commandsJson = commandBuilders.map((command) => command.toJSON());
