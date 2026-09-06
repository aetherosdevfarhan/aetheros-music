const { SlashCommandBuilder } = require('discord.js');
const music = require('../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Set loop mode.')
    .addStringOption(o =>
      o.setName('mode').setDescription('Loop mode').setRequired(true)
        .addChoices(
          { name: 'Off', value: 'off' },
          { name: 'Track', value: 'track' },
          { name: 'Queue', value: 'queue' }
        )),
  async execute(interaction) {
    try {
      const mode = interaction.options.getString('mode');
      music.setLoop(interaction.guild.id, mode);
      return interaction.reply(`🔁 Loop mode set to **${mode}**.`);
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};
