const { SlashCommandBuilder } = require('discord.js');
const music = require('../utils/musicManager');
const { nowPlayingEmbed, controlRow } = require('../utils/musicUI');

module.exports = {
  data: new SlashCommandBuilder().setName('nowplaying').setDescription('Show the currently playing song.'),
  async execute(interaction) {
    const queue = music.getQueue(interaction.guild.id);
    if (!queue?.nowPlaying) return interaction.reply({ content: 'Nothing is playing right now.', ephemeral: true });
    return interaction.reply({ embeds: [nowPlayingEmbed(queue)], components: [controlRow()] });
  }
};
