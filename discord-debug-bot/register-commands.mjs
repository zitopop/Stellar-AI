import {
  REST,
  Routes,
  SlashCommandBuilder,
} from 'discord.js';

const token = process.env.DISCORD_BOT_TOKEN;
const applicationId = process.env.DISCORD_APPLICATION_ID;
const guildId = process.env.DISCORD_GUILD_ID || '';

if (!token) throw new Error('DISCORD_BOT_TOKEN is required.');
if (!applicationId) throw new Error('DISCORD_APPLICATION_ID is required.');

const command = new SlashCommandBuilder()
  .setName('debug')
  .setDescription('Fix a broken FiveM or Roblox Lua/Luau script with Stellar AI')
  .addStringOption((option) => option
    .setName('code')
    .setDescription('Paste your broken script or error log')
    .setRequired(true)
    .setMaxLength(6000))
  .toJSON();

const rest = new REST({ version: '10' }).setToken(token);
const collectionRoute = guildId
  ? Routes.applicationGuildCommands(applicationId, guildId)
  : Routes.applicationCommands(applicationId);

const existing = await rest.get(collectionRoute);
const previous = Array.isArray(existing)
  ? existing.find((item) => item?.name === command.name)
  : null;

if (previous?.id) {
  const commandRoute = guildId
    ? Routes.applicationGuildCommand(applicationId, guildId, previous.id)
    : Routes.applicationCommand(applicationId, previous.id);
  await rest.patch(commandRoute, { body: command });
  console.log(`Updated /${command.name} command${guildId ? ` in guild ${guildId}` : ' globally'}.`);
} else {
  await rest.post(collectionRoute, { body: command });
  console.log(`Registered /${command.name} command${guildId ? ` in guild ${guildId}` : ' globally'}.`);
}
