const { Events, EmbedBuilder } = require('discord.js');
const music = require('../utils/musicManager');
const { nowPlayingEmbed, controlRow, queueEmbed, COLOR } = require('../utils/musicUI');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    // Diagnostic: empty content on a normal-looking message almost always means the
    // MESSAGE CONTENT INTENT toggle is off in the Discord Developer Portal (Bot page).
    if (message.content === '' && message.embeds.length === 0 && message.attachments.size === 0 && message.stickers.size === 0) {
      console.warn(
        '[AETHEROS MUSIC] Received empty message content. If this persists, enable "MESSAGE CONTENT INTENT" ' +
        'at https://discord.com/developers/applications -> your app -> Bot -> Privileged Gateway Intents.'
      );
    }

    const prefix = process.env.PREFIX || '#';
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const cmd = args.shift()?.toLowerCase();
    if (!cmd) return;

    if (cmd === 'play' || cmd === 'p') {
      const query = args.join(' ');
      if (!query) return message.reply(`❌ Give me a song name or link: \`${prefix}play never gonna give you up\``);
      const loadingMsg = await message.reply('🔎 Searching...');
      try {
        const result = await music.addToQueue({
          guild: message.guild,
          member: message.member,
          textChannel: message.channel,
          query
        });
        if (result.startedPlaying) {
          const queue = music.getQueue(message.guild.id);
          return loadingMsg.edit({ content: null, embeds: [nowPlayingEmbed(queue)], components: [controlRow()] });
        }
        const embed = new EmbedBuilder()
          .setColor(COLOR)
          .setTitle('➕ Added to queue')
          .setDescription(`${music.sourceEmoji(result.track.source)} **${result.track.title}**`)
          .setThumbnail(result.track.thumbnail || null)
          .addFields(
            { name: 'Duration', value: music.formatDuration(result.track.durationSeconds), inline: true },
            { name: 'Position', value: `${result.position}`, inline: true }
          );
        return loadingMsg.edit({ content: null, embeds: [embed] });
      } catch (err) {
        return loadingMsg.edit(`❌ ${err.message}`);
      }
    }

    if (cmd === 'skip') {
      try {
        const skipped = music.skip(message.guild.id);
        return message.reply(`⏭️ Skipped **${skipped.title}**.`);
      } catch (err) {
        return message.reply(`❌ ${err.message}`);
      }
    }

    if (cmd === 'stop') {
      try {
        music.stop(message.guild.id);
        return message.reply('⏹️ Stopped playback and cleared the queue.');
      } catch (err) {
        return message.reply(`❌ ${err.message}`);
      }
    }

    if (cmd === 'pause') {
      try {
        music.pause(message.guild.id);
        return message.reply('⏸️ Paused.');
      } catch (err) {
        return message.reply(`❌ ${err.message}`);
      }
    }

    if (cmd === 'resume') {
      try {
        music.resume(message.guild.id);
        return message.reply('▶️ Resumed.');
      } catch (err) {
        return message.reply(`❌ ${err.message}`);
      }
    }

    if (cmd === 'volume' || cmd === 'vol') {
      const percent = Math.max(0, Math.min(200, parseInt(args[0], 10)));
      if (Number.isNaN(percent)) return message.reply(`❌ Give me a number 0-200: \`${prefix}volume 100\``);
      try {
        music.setVolume(message.guild.id, percent);
        return message.reply(`🔊 Volume set to ${percent}%.`);
      } catch (err) {
        return message.reply(`❌ ${err.message}`);
      }
    }

    if (cmd === 'loop') {
      const mode = args[0]?.toLowerCase();
      if (!['off', 'track', 'queue'].includes(mode)) return message.reply(`❌ Usage: \`${prefix}loop off|track|queue\``);
      try {
        music.setLoop(message.guild.id, mode);
        return message.reply(`🔁 Loop mode set to **${mode}**.`);
      } catch (err) {
        return message.reply(`❌ ${err.message}`);
      }
    }

    if (cmd === 'shuffle') {
      try {
        music.shuffle(message.guild.id);
        return message.reply('🔀 Queue shuffled.');
      } catch (err) {
        return message.reply(`❌ ${err.message}`);
      }
    }

    if (cmd === '247') {
      const mode = args[0]?.toLowerCase();
      if (!['on', 'off'].includes(mode)) return message.reply(`❌ Usage: \`${prefix}247 on\` or \`${prefix}247 off\``);
      try {
        music.set247(message.guild.id, mode === 'on');
        return message.reply(mode === 'on' ? '📌 24/7 mode enabled.' : '📌 24/7 mode disabled.');
      } catch (err) {
        return message.reply(`❌ ${err.message}`);
      }
    }

    if (cmd === 'nowplaying' || cmd === 'np') {
      const queue = music.getQueue(message.guild.id);
      if (!queue?.nowPlaying) return message.reply('Nothing is playing right now.');
      return message.reply({ embeds: [nowPlayingEmbed(queue)], components: [controlRow()] });
    }

    if (cmd === 'queue' || cmd === 'q') {
      const queue = music.getQueue(message.guild.id);
      if (!queue || (!queue.nowPlaying && queue.songs.length === 0)) return message.reply('The queue is empty.');
      return message.reply({ embeds: [queueEmbed(queue)] });
    }

    if (cmd === 'help') {
      const embed = new EmbedBuilder()
        .setColor(COLOR)
        .setTitle('🎵 AETHEROS MUSIC')
        .setDescription(
          `**Playback**\n` +
          `\`${prefix}play <song or link>\` — YouTube, Spotify, or SoundCloud links, or just a song name\n` +
          `\`${prefix}pause\` · \`${prefix}resume\` · \`${prefix}skip\` · \`${prefix}stop\`\n\n` +
          `**Queue**\n` +
          `\`${prefix}queue\` · \`${prefix}shuffle\` · \`${prefix}loop off|track|queue\`\n\n` +
          `**Other**\n` +
          `\`${prefix}volume <0-200>\` · \`${prefix}nowplaying\` · \`${prefix}247 on|off\`\n\n` +
          `All of these also work as slash commands: \`/play\`, \`/skip\`, etc.`
        );
      return message.reply({ embeds: [embed] });
    }
  }
};
