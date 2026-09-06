const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const music = require('../utils/musicManager');
const { nowPlayingEmbed, controlRow, COLOR } = require('../utils/musicUI');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from YouTube, Spotify, or SoundCloud.')
    .addStringOption(o => o.setName('query').setDescription('Song name, or a YouTube/Spotify/SoundCloud link').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply();
    const query = interaction.options.getString('query');
    try {
      const result = await music.addToQueue({
        guild: interaction.guild,
        member: interaction.member,
        textChannel: interaction.channel,
        query
      });

      if (result.startedPlaying) {
        const queue = music.getQueue(interaction.guild.id);
        return interaction.editReply({ embeds: [nowPlayingEmbed(queue)], components: [controlRow()] });
      }

      const embed = new EmbedBuilder()
        .setColor(COLOR)
        .setTitle('➕ Added to queue')
        .setDescription(`${music.sourceEmoji(result.track.source)} **${result.track.title}**`)
        .setThumbnail(result.track.thumbnail || null)
        .addFields(
          { name: 'Duration', value: music.formatDuration(result.track.durationSeconds), inline: true },
          { name: 'Position', value: `${result.position}`, inline: true }
        );
      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      return interaction.editReply(`❌ ${err.message}`);
    }
  }
};
