const {
  Client,
  GatewayIntentBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require('discord.js');

const dotenv = require('dotenv');
const express = require('express');
const path = require('path');
const fs = require('fs');

// =====================================================
// ENVIRONMENT
// =====================================================

dotenv.config();

const requiredEnv = ['DISCORD_TOKEN', 'CLIENT_ID'];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error('Missing required environment variable: ' + key);
    process.exit(1);
  }
}

const CLIENT_ID = process.env.CLIENT_ID;
const INVITE_PERMISSIONS = process.env.INVITE_PERMISSIONS || '2147485696';
const INVITE_URL =
  'https://discord.com/api/oauth2/authorize?client_id=' +
  encodeURIComponent(CLIENT_ID) +
  '&permissions=' +
  encodeURIComponent(INVITE_PERMISSIONS) +
  '&scope=bot%20applications.commands';

// =====================================================
// DISCORD CLIENT
// =====================================================

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// =====================================================
// CONFIG STORAGE
// =====================================================

const DATA_DIRECTORY = path.join(__dirname, 'data');
const CONFIG_FILE = path.join(DATA_DIRECTORY, 'guild-config.json');
const LEGACY_CONFIG_FILE = path.join(__dirname, 'guild-config.json');

function loadGuildConfigs() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }

    if (fs.existsSync(LEGACY_CONFIG_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(LEGACY_CONFIG_FILE, 'utf8'));
      fs.mkdirSync(DATA_DIRECTORY, { recursive: true });
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(parsed, null, 2), 'utf8');
      console.log('Migrated root guild-config.json to data/guild-config.json');
      return parsed;
    }

    return {};
  } catch (error) {
    console.error('Could not load guild configuration:', error);
    return {};
  }
}

function saveGuildConfigs() {
  fs.mkdirSync(DATA_DIRECTORY, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(guildConfigs, null, 2), 'utf8');
}

const guildConfigs = loadGuildConfigs();

function getGuildConfig(guildId) {
  return guildConfigs[guildId] || null;
}

function setGuildConfig(guildId, partial) {
  guildConfigs[guildId] = {
    ...(guildConfigs[guildId] || {}),
    ...partial,
    updatedAt: new Date().toISOString(),
  };
  saveGuildConfigs();
}

// =====================================================
// WEBSITE / HEALTH CHECK
// =====================================================

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/invite', (_req, res) => {
  res.redirect(INVITE_URL);
});

app.get('/api/status', (_req, res) => {
  res.status(200).json({
    ok: true,
    bot: client.user ? client.user.tag : null,
    discordReady: client.isReady(),
    guilds: client.guilds.cache.size,
    configuredServers: Object.keys(guildConfigs).length,
    uptimeSeconds: Math.floor(process.uptime()),
    inviteUrl: INVITE_URL,
  });
});

app.get('/ping', (_req, res) => {
  res.status(200).send('Bot is alive!');
});

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, discordReady: client.isReady() });
});

app.listen(port, '0.0.0.0', () => {
  console.log('Website listening on port ' + port);
  console.log('Invite page: /invite');
});

// =====================================================
// SLASH COMMANDS
// =====================================================

const commands = [
  new SlashCommandBuilder()
    .setName('setup_raid')
    .setDescription('Configure this server raid channel and alert roles')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addRoleOption(option =>
      option.setName('big_raid_role').setDescription('Role to ping when someone uses /raid').setRequired(true)
    )
    .addRoleOption(option =>
      option.setName('backup_role').setDescription('Role to ping when someone uses /backup').setRequired(true)
    )
    .addChannelOption(option =>
      option
        .setName('raid_channel')
        .setDescription('Channel where the bot should post raid calls')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('clan_name')
        .setDescription('Optional clan/server name shown in embeds')
        .setRequired(false)
        .setMaxLength(80)
    ),

  new SlashCommandBuilder()
    .setName('config')
    .setDescription('Show this server raid bot configuration')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show how to use the raid bot'),

  new SlashCommandBuilder()
    .setName('backup')
    .setDescription('Request backup against teamers')
    .setDefaultMemberPermissions(null)
    .addStringOption(option =>
      option.setName('teamers').setDescription('List the teamers').setRequired(true).setMaxLength(1000)
    )
    .addStringOption(option =>
      option.setName('allies').setDescription('List your allies').setRequired(true).setMaxLength(1000)
    )
    .addStringOption(option =>
      option
        .setName('server_link')
        .setDescription('Roblox server link or RoSeal join link')
        .setRequired(true)
        .setMaxLength(1000)
    ),

  new SlashCommandBuilder()
    .setName('raid')
    .setDescription('Start a big TSB raid')
    .setDefaultMemberPermissions(null)
    .addStringOption(option =>
      option.setName('target').setDescription('Player, clan, or target being raided').setRequired(true).setMaxLength(1000)
    )
    .addStringOption(option =>
      option.setName('allies').setDescription('List allies joining the raid').setRequired(true).setMaxLength(1000)
    )
    .addStringOption(option =>
      option
        .setName('server_link')
        .setDescription('Roblox server link or RoSeal join link')
        .setRequired(true)
        .setMaxLength(1000)
    ),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function registerGlobalCommands() {
  console.log('Refreshing global application commands...');
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log('Commands registered: /setup_raid, /config, /help, /backup, /raid');
}

// =====================================================
// HELPERS
// =====================================================

function isValidServerLink(value) {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();

    const isRobloxLink =
      url.protocol === 'https:' && (host === 'roblox.com' || host.endsWith('.roblox.com'));

    const isRoSealLink =
      url.protocol === 'https:' &&
      (host === 'roseal.live' || host === 'www.roseal.live') &&
      url.pathname.toLowerCase() === '/join' &&
      Boolean(url.searchParams.get('placeId')) &&
      Boolean(url.searchParams.get('gameInstanceId'));

    return isRobloxLink || isRoSealLink;
  } catch {
    return false;
  }
}

function cleanInput(value) {
  return value
    .replace(/@everyone/gi, '@ everyone')
    .replace(/@here/gi, '@ here')
    .trim();
}

function createRaidRows(starterId, serverLink) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Join Server')
        .setEmoji('🔗')
        .setStyle(ButtonStyle.Link)
        .setURL(serverLink),
      new ButtonBuilder()
        .setCustomId('end_raid:' + starterId)
        .setLabel('End Raid')
        .setEmoji('🛑')
        .setStyle(ButtonStyle.Danger)
    ),
  ];
}

function createEndedRaidRow(serverLink) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Join Link')
        .setEmoji('🔗')
        .setStyle(ButtonStyle.Link)
        .setURL(serverLink),
      new ButtonBuilder()
        .setCustomId('raid_ended')
        .setLabel('Raid Ended')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    ),
  ];
}

function hasChannelPermissions(guild, channel) {
  const botMember = guild.members.me;
  if (!botMember) return false;

  const permissions = channel.permissionsFor(botMember);
  return (
    permissions?.has(PermissionFlagsBits.ViewChannel) &&
    permissions?.has(PermissionFlagsBits.SendMessages) &&
    permissions?.has(PermissionFlagsBits.EmbedLinks)
  );
}

function canPingRole(guild, channel, role) {
  const botMember = guild.members.me;
  if (!botMember) return false;

  const permissions = channel.permissionsFor(botMember);
  return role.mentionable || permissions?.has(PermissionFlagsBits.MentionEveryone);
}

async function getConfiguredDestination(guild, roleId) {
  const config = getGuildConfig(guild.id);

  if (!config) {
    return { error: '❌ This server is not configured yet. An admin must run `/setup_raid` first.' };
  }

  const channel = await guild.channels.fetch(config.raidChannelId).catch(() => null);
  if (!channel || channel.type !== ChannelType.GuildText) {
    return { error: '❌ The configured raid channel no longer exists. An admin must run `/setup_raid` again.' };
  }

  const role = await guild.roles.fetch(roleId).catch(() => null);
  if (!role) {
    return { error: '❌ The configured alert role no longer exists. An admin must run `/setup_raid` again.' };
  }

  if (!hasChannelPermissions(guild, channel)) {
    return {
      error: '❌ I need **View Channel**, **Send Messages**, and **Embed Links** permission in ' + channel + '.',
    };
  }

  return { channel, role, canMentionRole: canPingRole(guild, channel, role) };
}

function makeBaseEmbed(interaction, color, title, description) {
  const config = getGuildConfig(interaction.guild.id) || {};
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp()
    .setFooter({ text: (config.clanName || interaction.guild.name) + ' • Raid System' });

  if (interaction.guild.iconURL()) {
    embed.setThumbnail(interaction.guild.iconURL({ size: 256 }));
  }

  return embed;
}

async function postRaidCall(interaction, roleId, pingText, embed, serverLink) {
  const destination = await getConfiguredDestination(interaction.guild, roleId);

  if (destination.error) {
    await interaction.editReply(destination.error);
    return;
  }

  const content = destination.canMentionRole
    ? destination.role.toString() + ' ' + pingText
    : pingText +
      '\n⚠️ I could not ping ' +
      destination.role.toString() +
      ' because the role is not mentionable and I do not have **Mention @everyone, @here, and All Roles** permission.';

  const message = await destination.channel.send({
    content,
    embeds: [embed],
    components: createRaidRows(interaction.user.id, serverLink),
    allowedMentions: destination.canMentionRole ? { roles: [destination.role.id] } : { roles: [] },
  });

  await interaction.editReply(
    '✅ Posted in ' +
      destination.channel +
      '!\n🔗 ' +
      message.url +
      (destination.canMentionRole
        ? ''
        : '\n⚠️ Posted without pinging the role. Ask an admin to make the role mentionable or give the bot Mention Roles permission.')
  );
}

// =====================================================
// BOT READY
// =====================================================

client.once(Events.ClientReady, readyClient => {
  console.log('Ready! Logged in as ' + readyClient.user.tag);
  console.log('Serving ' + readyClient.guilds.cache.size + ' Discord server(s).');
});

// =====================================================
// INTERACTION HANDLER
// =====================================================

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === 'setup_raid') {
      if (!interaction.inGuild()) {
        await interaction.reply({ content: '❌ Use this command inside a Discord server.', ephemeral: true });
        return;
      }

      const bigRaidRole = interaction.options.getRole('big_raid_role', true);
      const backupRole = interaction.options.getRole('backup_role', true);
      const raidChannel = interaction.options.getChannel('raid_channel', true);
      const clanName = interaction.options.getString('clan_name', false) || interaction.guild.name;

      if (raidChannel.type !== ChannelType.GuildText) {
        await interaction.reply({ content: '❌ Choose a normal text channel.', ephemeral: true });
        return;
      }

      setGuildConfig(interaction.guild.id, {
        raidChannelId: raidChannel.id,
        bigRaidRoleId: bigRaidRole.id,
        backupRoleId: backupRole.id,
        clanName,
      });

      await interaction.reply({
        content:
          '✅ Raid bot configured.\n\n' +
          '**Clan/server name:** ' + clanName + '\n' +
          '**/raid** will ping: ' + bigRaidRole + '\n' +
          '**/backup** will ping: ' + backupRole + '\n' +
          '**Raid calls will post in:** ' + raidChannel + '\n\n' +
          'No role was pinged while setting this up.',
        ephemeral: true,
      });
      return;
    }

    if (interaction.isChatInputCommand() && interaction.commandName === 'config') {
      if (!interaction.inGuild()) {
        await interaction.reply({ content: '❌ Use this command inside a Discord server.', ephemeral: true });
        return;
      }

      const config = getGuildConfig(interaction.guild.id);
      if (!config) {
        await interaction.reply({ content: '❌ Not configured yet. Run `/setup_raid`.', ephemeral: true });
        return;
      }

      await interaction.reply({
        content:
          '⚙️ **Current config**\n' +
          '**Clan/server:** ' + (config.clanName || interaction.guild.name) + '\n' +
          '**Raid channel:** <#' + config.raidChannelId + '>\n' +
          '**Big raid role:** <@&' + config.bigRaidRoleId + '>\n' +
          '**Backup role:** <@&' + config.backupRoleId + '>',
        ephemeral: true,
      });
      return;
    }

    if (interaction.isChatInputCommand() && interaction.commandName === 'help') {
      await interaction.reply({
        content:
          '📌 **TSB Raid Bot Help**\n\n' +
          '`/setup_raid` - admin setup for roles and channel\n' +
          '`/raid` - start a big raid call\n' +
          '`/backup` - request backup against teamers\n' +
          '`/config` - show server config\n\n' +
          'Website invite: ' + INVITE_URL,
        ephemeral: true,
      });
      return;
    }

    if (interaction.isChatInputCommand() && interaction.commandName === 'backup') {
      if (!interaction.inGuild()) {
        await interaction.reply({ content: '❌ Use this command inside a Discord server.', ephemeral: true });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      const teamers = cleanInput(interaction.options.getString('teamers', true));
      const allies = cleanInput(interaction.options.getString('allies', true));
      const serverLink = interaction.options.getString('server_link', true).trim();
      const config = getGuildConfig(interaction.guild.id);

      if (!isValidServerLink(serverLink)) {
        await interaction.editReply('❌ Use a valid HTTPS Roblox server link or a RoSeal `/join` link containing both `placeId` and `gameInstanceId`.');
        return;
      }

      if (!config) {
        await interaction.editReply('❌ This server is not configured yet. An admin must run `/setup_raid` first.');
        return;
      }

      const embed = makeBaseEmbed(interaction, 0x3498db, '🚨 TSB BACKUP NEEDED 🚨', 'Status: **ACTIVE**\n\n🛡️ **BACKUP REQUESTED — JOIN FAST!**')
        .addFields(
          { name: '👤 Requester', value: interaction.user.toString(), inline: false },
          { name: '🚩 Teamers', value: teamers, inline: false },
          { name: '🤝 Allies', value: allies, inline: false },
          { name: '🔗 Join Link', value: serverLink, inline: false }
        );

      await postRaidCall(interaction, config.backupRoleId, '**BACKUP NEEDED!**', embed, serverLink);
      return;
    }

    if (interaction.isChatInputCommand() && interaction.commandName === 'raid') {
      if (!interaction.inGuild()) {
        await interaction.reply({ content: '❌ Use this command inside a Discord server.', ephemeral: true });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      const target = cleanInput(interaction.options.getString('target', true));
      const allies = cleanInput(interaction.options.getString('allies', true));
      const serverLink = interaction.options.getString('server_link', true).trim();
      const config = getGuildConfig(interaction.guild.id);

      if (!isValidServerLink(serverLink)) {
        await interaction.editReply('❌ Use a valid HTTPS Roblox server link or a RoSeal `/join` link containing both `placeId` and `gameInstanceId`.');
        return;
      }

      if (!config) {
        await interaction.editReply('❌ This server is not configured yet. An admin must run `/setup_raid` first.');
        return;
      }

      const embed = makeBaseEmbed(interaction, 0xe74c3c, '🔥🚨 BIG TSB RAID 🚨🔥', 'Status: **ACTIVE**\n\n⚔️ **BIG RAID CALLED — JOIN NOW!**')
        .addFields(
          { name: '👑 Raid Leader', value: interaction.user.toString(), inline: false },
          { name: '🎯 Target', value: target, inline: false },
          { name: '🤝 Allies', value: allies, inline: false },
          { name: '🔗 Join Link', value: serverLink, inline: false }
        );

      await postRaidCall(interaction, config.bigRaidRoleId, '**BIG RAID — JOIN NOW!**', embed, serverLink);
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith('end_raid:')) {
      const starterId = interaction.customId.split(':')[1];

      if (interaction.user.id !== starterId) {
        await interaction.reply({ content: '❌ Only the person who started this raid can end it.', ephemeral: true });
        return;
      }

      const originalEmbed = interaction.message.embeds[0];
      if (!originalEmbed) {
        await interaction.reply({ content: '❌ Could not find the original raid information.', ephemeral: true });
        return;
      }

      const oldDescription = originalEmbed.description || '';
      const endedDescription = oldDescription.includes('Status: **ACTIVE**')
        ? oldDescription.replace('Status: **ACTIVE**', 'Status: **ENDED**')
        : 'Status: **ENDED**';

      const linkButton = interaction.message.components?.[0]?.components?.find(c => c.style === ButtonStyle.Link);
      const serverLink = linkButton?.url || 'https://www.roblox.com/';

      const endedEmbed = EmbedBuilder.from(originalEmbed)
        .setColor(0x95a5a6)
        .setDescription(endedDescription)
        .addFields({ name: '🛑 Raid Ended By', value: interaction.user.toString(), inline: false })
        .setTimestamp()
        .setFooter({ text: 'TSB Raid Bot • Ended by ' + interaction.user.username });

      await interaction.update({ embeds: [endedEmbed], components: createEndedRaidRow(serverLink) });
      return;
    }
  } catch (error) {
    console.error('Interaction error:', error);
    const errorText = '❌ Something went wrong while processing that action. Check the bot terminal.';

    if (interaction.isRepliable()) {
      if (interaction.deferred) await interaction.editReply(errorText).catch(() => {});
      else if (interaction.replied) await interaction.followUp({ content: errorText, ephemeral: true }).catch(() => {});
      else await interaction.reply({ content: errorText, ephemeral: true }).catch(() => {});
    }
  }
});

// =====================================================
// ERROR LOGGING
// =====================================================

process.on('unhandledRejection', error => console.error('Unhandled promise rejection:', error));
process.on('uncaughtException', error => console.error('Uncaught exception:', error));

// =====================================================
// START BOT
// =====================================================

(async () => {
  try {
    await registerGlobalCommands();
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    console.error('Startup failed:', error);
    process.exit(1);
  }
})();
