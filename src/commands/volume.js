const { SlashCommandBuilder } = require('discord.js');
const music = require('../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set playback volume.')
    .addIntegerOption(o => o.setName('percent').setDescription('0-200').setRequired(true).setMinValue(0).setMaxValue(200)),
  async execute(interaction) {
    try {
      const percent = interaction.options.getInteger('percent');
      music.setVolume(interaction.guild.id, percent);
      return interaction.reply(`🔊 Volume set to ${percent}%.`);
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};
