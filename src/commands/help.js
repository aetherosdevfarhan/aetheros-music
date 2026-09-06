const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLOR } = require('../utils/musicUI');

module.exports = {
  data: new SlashCommandBuilder().setName('help').setDescription('Show AETHEROS MUSIC commands.'),
  async execute(interaction) {
    const prefix = process.env.PREFIX || '#';
    const embed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle('🎵 AETHEROS MUSIC')
      .setDescription(
        `Use slash commands or the \`${prefix}\` prefix — both work the same.\n\n` +
        `**Playback**\n` +
        `\`/play <song or link>\` — YouTube, Spotify, or SoundCloud links, or just a song name\n` +
        `\`/pause\` · \`/resume\` · \`/skip\` · \`/stop\`\n\n` +
        `**Queue**\n` +
        `\`/queue\` · \`/shuffle\` · \`/loop <off|track|queue>\`\n\n` +
        `**Other**\n` +
        `\`/volume <0-200>\` · \`/nowplaying\` · \`/247 <on|off>\`\n\n` +
        `Prefix versions: \`${prefix}play\`, \`${prefix}skip\`, \`${prefix}stop\`, \`${prefix}pause\`, \`${prefix}resume\`, ` +
        `\`${prefix}queue\`, \`${prefix}np\`, \`${prefix}volume\`, \`${prefix}loop\`, \`${prefix}shuffle\`, \`${prefix}247\``
      );
    return interaction.reply({ embeds: [embed] });
  }
};
