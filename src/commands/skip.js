const { SlashCommandBuilder } = require('discord.js');
const music = require('../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder().setName('skip').setDescription('Skip the current song.'),
  async execute(interaction) {
    try {
      const skipped = music.skip(interaction.guild.id);
      return interaction.reply(`⏭️ Skipped **${skipped.title}**.`);
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};
