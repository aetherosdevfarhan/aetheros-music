const { SlashCommandBuilder } = require('discord.js');
const music = require('../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('247')
    .setDescription('Keep the bot in voice 24/7 instead of leaving when idle.')
    .addBooleanOption(o => o.setName('enabled').setDescription('Turn 24/7 mode on or off').setRequired(true)),
  async execute(interaction) {
    try {
      const enabled = interaction.options.getBoolean('enabled');
      music.set247(interaction.guild.id, enabled);
      return interaction.reply(enabled ? '📌 24/7 mode enabled — I\'ll stay connected.' : '📌 24/7 mode disabled.');
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};
