const { SlashCommandBuilder } = require('discord.js');
const music = require('../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder().setName('resume').setDescription('Resume playback.'),
  async execute(interaction) {
    try {
      music.resume(interaction.guild.id);
      return interaction.reply('▶️ Resumed.');
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};
