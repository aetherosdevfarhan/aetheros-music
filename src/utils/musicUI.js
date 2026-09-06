const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const music = require('./musicManager');

const COLOR = 0x1DB954; // Spotify-green, generic "music" brand color

function nowPlayingEmbed(queue) {
  const track = queue.nowPlaying;
  const elapsed = queue.startedAt ? Math.floor((Date.now() - queue.startedAt) / 1000) : 0;
  return new EmbedBuilder()
    .setColor(COLOR)
    .setAuthor({ name: 'AETHEROS MUSIC — Now Playing' })
    .setTitle(track.title)
    .setThumbnail(track.thumbnail || null)
    .setDescription(
      `${music.progressBar(elapsed, track.durationSeconds)}\n` +
      `${music.formatDuration(elapsed)} / ${music.formatDuration(track.durationSeconds)}`
    )
    .addFields(
      { name: 'Source', value: `${music.sourceEmoji(track.source)} ${cap(track.source)}`, inline: true },
      { name: 'Requested by', value: `<@${track.requestedBy}>`, inline: true },
      { name: 'Loop', value: cap(queue.loop), inline: true },
      { name: 'Volume', value: `${queue.volume}%`, inline: true },
      { name: 'Up next', value: queue.songs.length ? `${queue.songs.length} song(s) in queue` : 'Nothing queued', inline: true }
    );
}

function controlRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('aeth_music_pauseresume').setEmoji('⏯️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('aeth_music_skip').setEmoji('⏭️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('aeth_music_stop').setEmoji('⏹️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('aeth_music_shuffle').setEmoji('🔀').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('aeth_music_loop').setEmoji('🔁').setStyle(ButtonStyle.Secondary)
  );
}

function queueEmbed(queue) {
  const lines = queue.songs.slice(0, 10).map((s, i) =>
    `**${i + 1}.** ${music.sourceEmoji(s.source)} ${s.title} — ${music.formatDuration(s.durationSeconds)}`
  );
  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle('📜 Queue')
    .setDescription(
      `**Now playing:** ${queue.nowPlaying ? `${music.sourceEmoji(queue.nowPlaying.source)} ${queue.nowPlaying.title}` : 'Nothing'}\n\n` +
      (lines.length ? lines.join('\n') : '_Queue is empty._') +
      (queue.songs.length > 10 ? `\n...and ${queue.songs.length - 10} more` : '')
    );
}

function cap(str) {
  if (!str) return 'Off';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = { nowPlayingEmbed, controlRow, queueEmbed, COLOR };
