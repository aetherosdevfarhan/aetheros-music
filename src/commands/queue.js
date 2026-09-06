const { SlashCommandBuilder } = require('discord.js');
const music = require('../utils/musicManager');
const { queueEmbed } = require('../utils/musicUI');

module.exports = {
  data: new SlashCommandBuilder().setName('queue').setDescription('Show the current queue.'),
  async execute(interaction) {
    const queue = music.getQueue(interaction.guild.id);
    if (!queue || (!queue.nowPlaying && queue.songs.length === 0)) {
      return interaction.reply({ content: 'The queue is empty.', ephemeral: true });
    }
    return interaction.reply({ embeds: [queueEmbed(queue)] });
  }
};
