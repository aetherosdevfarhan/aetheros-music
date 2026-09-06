const { Events } = require('discord.js');
const music = require('../utils/musicManager');
const { nowPlayingEmbed, controlRow } = require('../utils/musicUI');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction);
      } catch (err) {
        console.error(`[AETHEROS MUSIC] Error in /${interaction.commandName}:`, err);
        const payload = { content: '⚠️ Something went wrong running that command.', ephemeral: true };
        if (interaction.replied || interaction.deferred) await interaction.followUp(payload).catch(() => null);
        else await interaction.reply(payload).catch(() => null);
      }
      return;
    }

    if (interaction.isButton() && interaction.customId.startsWith('aeth_music_')) {
      const guildId = interaction.guild.id;
      try {
        if (interaction.customId === 'aeth_music_pauseresume') {
          const queue = music.getQueue(guildId);
          if (!queue?.nowPlaying) return interaction.reply({ content: 'Nothing is playing.', ephemeral: true });
          const isPaused = queue.player.state.status === 'paused';
          if (isPaused) music.resume(guildId); else music.pause(guildId);
        } else if (interaction.customId === 'aeth_music_skip') {
          music.skip(guildId);
        } else if (interaction.customId === 'aeth_music_stop') {
          music.stop(guildId);
          return interaction.update({ content: '⏹️ Stopped playback and cleared the queue.', embeds: [], components: [] });
        } else if (interaction.customId === 'aeth_music_shuffle') {
          music.shuffle(guildId);
        } else if (interaction.customId === 'aeth_music_loop') {
          const queue = music.getQueue(guildId);
          const next = { off: 'track', track: 'queue', queue: 'off' }[queue.loop] || 'off';
          music.setLoop(guildId, next);
        }

        const queue = music.getQueue(guildId);
        if (queue?.nowPlaying) {
          return interaction.update({ embeds: [nowPlayingEmbed(queue)], components: [controlRow()] });
        }
        return interaction.update({ content: 'Nothing is playing right now.', embeds: [], components: [] });
      } catch (err) {
        return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true }).catch(() => null);
      }
    }
  }
};
