const { SlashCommandBuilder } = require('discord.js');
const music = require('../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder().setName('pause').setDescription('Pause playback.'),
  async execute(interaction) {
    try {
      music.pause(interaction.guild.id);
      return interaction.reply('⏸️ Paused.');
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};
