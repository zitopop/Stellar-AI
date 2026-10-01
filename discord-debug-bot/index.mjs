import {
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
} from 'discord.js';

const token = process.env.DISCORD_BOT_TOKEN;
const bridgeKey = process.env.STELLAR_DISCORD_BOT_KEY;
const apiUrl = process.env.STELLAR_DEBUG_API_URL || 'https://trystellarai.com/api/discord-debug';

if (!token) throw new Error('DISCORD_BOT_TOKEN is required.');
if (!bridgeKey) throw new Error('STELLAR_DISCORD_BOT_KEY is required.');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const cooldowns = new Map();
const inFlight = new Set();
const COOLDOWN_MS = 15_000;

function cleanForCodeBlock(value) {
  return String(value || '').replaceAll('```', '`\u200b``');
}

function truncate(value, max) {
  const text = String(value || '');
  if (text.length <= max) return text;
  return text.slice(0, Math.max(0, max - 16)).trimEnd() + '\n… truncated';
}

function getErrorMessage(payload, status) {
  if (typeof payload?.error === 'string') return payload.error;
  if (typeof payload?.error?.message === 'string') return payload.error.message;
  return `Stellar AI request failed (${status}).`;
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Stellar /debug bot ready as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'debug') return;

  const userId = interaction.user.id;
  const now = Date.now();
  const retryAt = cooldowns.get(userId) || 0;

  if (retryAt > now) {
    const seconds = Math.ceil((retryAt - now) / 1000);
    await interaction.reply({
      content: `⚡ Give Stellar ${seconds}s before another /debug request.`,
      ephemeral: true,
    });
    return;
  }

  if (inFlight.has(userId)) {
    await interaction.reply({
      content: '⚡ Your previous /debug request is still running.',
      ephemeral: true,
    });
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Stellar-Bot-Key': bridgeKey,
      },
      body: JSON.stringify({
        code: inputCode,
        discordUserId: userId,
        discordGuildId: interaction.guildId || null,
      }),
    });

    let payload = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }

    if (!response.ok) throw new Error(getErrorMessage(payload, response.status));

    const language = payload.language === 'luau' ? 'luau' : 'lua';
    const repairedCode = truncate(cleanForCodeBlock(payload.code), 3300);
    const summary = truncate(payload.summary || payload.answer || 'Repair generated.', 900);
    const description = repairedCode
      ? '```' + language + '\n' + repairedCode + '\n```'
      : truncate(cleanForCodeBlock(payload.answer || summary), 3800);

    const embed = new EmbedBuilder()
      .setColor(0x00F0FF)
      .setTitle('⚡ Stellar AI Script Repair')
      .setURL('https://trystellarai.com/')
      .setDescription(description)
      .addFields({ name: 'What Stellar found', value: summary || 'A corrected version is shown above.' })
      .setFooter({ text: 'Generated with Stellar AI · Start free at trystellarai.com' })
      .setTimestamp();

    await interaction.editReply({
      embeds: [embed],
      allowedMentions: { parse: [] },
    });
  } catch (error) {
    const message = error?.name === 'AbortError'
      ? 'Stellar AI took too long to respond. Try a smaller script or error excerpt.'
      : truncate(error?.message || 'Unable to process that script right now.', 1800);

    await interaction.editReply({
      content: `⚠️ ${message}\nTry directly at https://trystellarai.com/app?mode=debug`,
      allowedMentions: { parse: [] },
    });
  } finally {
    clearTimeout(timeout);
    inFlight.delete(userId);
  }
});

client.on(Events.Error, (error) => {
  console.error('Discord client error:', error);
});

await client.login(token);
