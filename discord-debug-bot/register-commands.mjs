import { REST, Routes } from 'discord.js';
import { commandsJson } from './commands.mjs';

const token = process.env.DISCORD_BOT_TOKEN;
const applicationId = process.env.DISCORD_APPLICATION_ID;
const guildId = process.env.DISCORD_GUILD_ID || '';

if (!token) throw new Error('DISCORD_BOT_TOKEN is required.');
if (!applicationId) throw new Error('DISCORD_APPLICATION_ID is required.');

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
    console.log(`Updated /${command.name}${guildId ? ` in guild ${guildId}` : ' globally'}.`);
  } else {
    await rest.post(collectionRoute, { body: command });
    console.log(`Registered /${command.name}${guildId ? ` in guild ${guildId}` : ' globally'}.`);
  }
}
