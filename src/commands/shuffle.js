const { SlashCommandBuilder } = require('discord.js');
const music = require('../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder().setName('shuffle').setDescription('Shuffle the queue.'),
  async execute(interaction) {
    try {
      music.shuffle(interaction.guild.id);
      return interaction.reply('🔀 Queue shuffled.');
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};
