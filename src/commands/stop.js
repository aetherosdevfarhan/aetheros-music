const { SlashCommandBuilder } = require('discord.js');
const music = require('../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder().setName('stop').setDescription('Stop playback and clear the queue.'),
  async execute(interaction) {
    try {
      music.stop(interaction.guild.id);
      return interaction.reply('⏹️ Stopped playback and cleared the queue.');
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};
