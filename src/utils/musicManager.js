const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  StreamType
} = require('@discordjs/voice');
const playdl = require('play-dl');

// ffmpeg-static bundles an ffmpeg binary so we don't depend on the host having one installed.
try {
  const ffmpegPath = require('ffmpeg-static');
  process.env.FFMPEG_PATH = ffmpegPath;
} catch {
  console.warn('[AETHEROS MUSIC] ffmpeg-static not installed — run npm install.');
}

// Spotify: metadata-lookup only. No bot can stream full tracks directly from Spotify —
// that's a Spotify platform restriction, not something any code can work around. We read the
// track's title/artist from Spotify, then find and stream the matching song from YouTube.
let spotifyReady = false;
(async () => {
  if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
    try {
      await playdl.setToken({
        spotify: {
          client_id: process.env.SPOTIFY_CLIENT_ID,
          client_secret: process.env.SPOTIFY_CLIENT_SECRET,
          refresh_token: '',
          market: 'US'
        }
      });
      spotifyReady = true;
      console.log('[AETHEROS MUSIC] Spotify link resolution enabled.');
    } catch (err) {
      console.warn('[AETHEROS MUSIC] Spotify credentials rejected:', err.message);
    }
  } else {
    console.warn('[AETHEROS MUSIC] SPOTIFY_CLIENT_ID/SPOTIFY_CLIENT_SECRET not set — Spotify links disabled, YouTube/SoundCloud still work.');
  }
})();

const queues = new Map(); // guildId -> queue

const EMPTY_CHANNEL_TIMEOUT_MS = 60_000;
const IDLE_TIMEOUT_MS = 5 * 60_000;
const VOICE_JOIN_TIMEOUT_MS = 30_000;
const VOICE_JOIN_ATTEMPTS = 2;

function getQueue(guildId) {
  return queues.get(guildId) || null;
}

function formatDuration(seconds) {
  if (!seconds || Number.isNaN(seconds)) return 'Live';
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

function progressBar(elapsedSeconds, totalSeconds, length = 20) {
  if (!totalSeconds || Number.isNaN(totalSeconds)) return '🔴 LIVE';
  const ratio = Math.min(1, Math.max(0, elapsedSeconds / totalSeconds));
  const filled = Math.round(ratio * length);
  return '▬'.repeat(filled) + '🔘' + '▬'.repeat(Math.max(0, length - filled));
}

function sourceEmoji(source) {
  return { youtube: '▶️', spotify: '🟢', soundcloud: '🟠' }[source] || '🎵';
}

function clearTimers(queue) {
  if (queue.idleTimer) clearTimeout(queue.idleTimer);
  if (queue.emptyTimer) clearTimeout(queue.emptyTimer);
  queue.idleTimer = null;
  queue.emptyTimer = null;
}

function destroyQueue(guildId) {
  const queue = queues.get(guildId);
  if (!queue) return;
  clearTimers(queue);
  try { queue.player.stop(true); } catch { /* ignore */ }
  try { queue.connection.destroy(); } catch { /* ignore */ }
  queues.delete(guildId);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------- Source resolution: YouTube / Spotify / SoundCloud ----------------

async function resolveFromYoutubeUrl(url, requestedBy) {
  const info = await playdl.video_basic_info(url);
  const details = info.video_details;
  return {
    source: 'youtube',
    title: details.title,
    streamUrl: details.url,
    durationSeconds: details.durationInSec,
    thumbnail: details.thumbnails?.[details.thumbnails.length - 1]?.url,
    requestedBy
  };
}

async function resolveFromYoutubeSearch(query, requestedBy) {
  const results = await playdl.search(query, { source: { youtube: 'video' }, limit: 1 });
  if (!results.length) return null;
  const video = results[0];
  return {
    source: 'youtube',
    title: video.title,
    streamUrl: video.url,
    durationSeconds: video.durationInSec,
    thumbnail: video.thumbnails?.[video.thumbnails.length - 1]?.url,
    requestedBy
  };
}

async function resolveFromSoundcloudUrl(url, requestedBy) {
  const track = await playdl.soundcloud(url);
  if (track.type !== 'track') {
    throw new Error('That SoundCloud link is a playlist/set — paste a link to a single track.');
  }
  return {
    source: 'soundcloud',
    title: track.name,
    streamUrl: track.url,
    durationSeconds: Math.floor((track.durationInMs || 0) / 1000),
    thumbnail: track.thumbnail,
    requestedBy
  };
}

async function resolveFromSpotifyUrl(url, requestedBy) {
  if (!spotifyReady) {
    throw new Error(
      "Spotify links aren't set up yet — the bot owner needs to add SPOTIFY_CLIENT_ID and " +
      "SPOTIFY_CLIENT_SECRET to the .env file (free at https://developer.spotify.com/dashboard). " +
      "YouTube and SoundCloud links work right now."
    );
  }
  const spotifyData = await playdl.spotify(url);
  if (spotifyData.type !== 'track') {
    throw new Error('That Spotify link is an album/playlist — paste a link to a single track for now.');
  }
  const artistNames = spotifyData.artists?.map(a => a.name).join(', ') || '';
  const searchQuery = `${spotifyData.name} ${artistNames}`.trim();
  const match = await resolveFromYoutubeSearch(searchQuery, requestedBy);
  if (!match) throw new Error(`Found "${spotifyData.name}" on Spotify but no matching version on YouTube to stream.`);
  match.title = artistNames ? `${spotifyData.name} — ${artistNames}` : spotifyData.name;
  match.source = 'spotify';
  return match;
}

async function isSoundcloudLink(text) {
  try {
    return (await playdl.so_validate(text)) === 'track';
  } catch {
    return false;
  }
}

async function resolveTrack(query, requestedBy) {
  const trimmed = query.trim();

  try {
    if (playdl.sp_validate(trimmed)) return await resolveFromSpotifyUrl(trimmed, requestedBy);
  } catch { /* not a spotify link */ }

  if (await isSoundcloudLink(trimmed)) return await resolveFromSoundcloudUrl(trimmed, requestedBy);

  if (playdl.yt_validate(trimmed) === 'video') return await resolveFromYoutubeUrl(trimmed, requestedBy);

  return await resolveFromYoutubeSearch(trimmed, requestedBy);
}

// ---------------- Playback ----------------

async function playNext(guildId) {
  const queue = queues.get(guildId);
  if (!queue) return;

  const next = queue.songs.shift();
  if (!next) {
    queue.nowPlaying = null;
    queue.startedAt = null;
    clearTimers(queue);
    if (!queue.stay247) {
      queue.idleTimer = setTimeout(() => destroyQueue(guildId), IDLE_TIMEOUT_MS);
    }
    return;
  }

  clearTimers(queue);
  queue.nowPlaying = next;
  queue.startedAt = Date.now();

  try {
    const stream = await playdl.stream(next.streamUrl);
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type || StreamType.Arbitrary,
      inlineVolume: true
    });
    resource.volume?.setVolume((queue.volume ?? 100) / 100);
    queue.player.play(resource);
  } catch (err) {
    console.error(`[AETHEROS MUSIC] Failed to stream "${next.title}" (${next.source}):`, err.message);
    queue.textChannel?.send(`⚠️ Couldn't play **${next.title}** (${err.message || 'stream error'}), skipping.`).catch(() => null);
    return playNext(guildId);
  }
}

async function connectWithRetry(guild, voiceChannel) {
  let lastErr;
  for (let attempt = 1; attempt <= VOICE_JOIN_ATTEMPTS; attempt++) {
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: true
    });

    connection.on('stateChange', (oldState, newState) => {
      console.log(`[AETHEROS MUSIC] [voice] (attempt ${attempt}) state: ${oldState.status} -> ${newState.status}`);
    });

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, VOICE_JOIN_TIMEOUT_MS);
      return connection;
    } catch (err) {
      lastErr = err;
      connection.destroy();
      console.warn(`[AETHEROS MUSIC] [voice] Join attempt ${attempt}/${VOICE_JOIN_ATTEMPTS} failed.`);
      if (attempt < VOICE_JOIN_ATTEMPTS) await sleep(2000);
    }
  }
  throw new Error(
    "Couldn't connect to the voice channel after 2 attempts. This almost always means the hosting " +
    "provider is blocking the UDP traffic Discord voice needs. Test by running the bot on your own PC — " +
    "if it works there, you need a host that supports Discord voice (a VPS, Railway, etc). " +
    "Original error: " + (lastErr?.message || 'timeout')
  );
}

async function getOrCreateQueue(guild, voiceChannel, textChannel) {
  let queue = queues.get(guild.id);
  if (queue) return queue;

  const connection = await connectWithRetry(guild, voiceChannel);
  const player = createAudioPlayer();
  connection.subscribe(player);

  queue = {
    guildId: guild.id,
    voiceChannelId: voiceChannel.id,
    textChannel,
    connection,
    player,
    songs: [],
    nowPlaying: null,
    startedAt: null,
    loop: 'off', // 'off' | 'track' | 'queue'
    volume: 100,
    stay247: false,
    idleTimer: null,
    emptyTimer: null
  };
  queues.set(guild.id, queue);

  player.on(AudioPlayerStatus.Idle, () => {
    const q = queues.get(guild.id);
    if (!q) return;
    if (q.loop === 'track' && q.nowPlaying) q.songs.unshift(q.nowPlaying);
    else if (q.loop === 'queue' && q.nowPlaying) q.songs.push(q.nowPlaying);
    playNext(guild.id);
  });

  player.on('error', (err) => {
    console.error('[AETHEROS MUSIC] Player error:', err);
    const q = queues.get(guild.id);
    q?.textChannel?.send(`⚠️ Playback error on **${q?.nowPlaying?.title ?? 'current track'}**, skipping.`).catch(() => null);
    playNext(guild.id);
  });

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000)
      ]);
    } catch {
      destroyQueue(guild.id);
    }
  });

  return queue;
}

async function addToQueue({ guild, member, textChannel, query }) {
  const voiceChannel = member.voice?.channel;
  if (!voiceChannel) throw new Error('Join a voice channel first.');
  if (!voiceChannel.joinable) throw new Error("I don't have permission to join that voice channel.");
  if (!voiceChannel.permissionsFor(guild.members.me)?.has(['Connect', 'Speak'])) {
    throw new Error("I need **Connect** and **Speak** permissions in your voice channel.");
  }

  const existing = queues.get(guild.id);
  if (existing && existing.voiceChannelId !== voiceChannel.id) {
    throw new Error(`I'm already playing music in <#${existing.voiceChannelId}>.`);
  }

  const track = await resolveTrack(query, member.id);
  if (!track) throw new Error("Couldn't find anything for that search.");

  const queue = await getOrCreateQueue(guild, voiceChannel, textChannel);
  clearTimers(queue);
  queue.songs.push(track);

  if (!queue.nowPlaying) {
    await playNext(guild.id);
    return { track, startedPlaying: true };
  }
  return { track, startedPlaying: false, position: queue.songs.length };
}

function skip(guildId) {
  const queue = queues.get(guildId);
  if (!queue || !queue.nowPlaying) throw new Error('Nothing is playing right now.');
  const skipped = queue.nowPlaying;
  queue.player.stop(true);
  return skipped;
}

function stop(guildId) {
  const queue = queues.get(guildId);
  if (!queue) throw new Error("I'm not playing anything right now.");
  destroyQueue(guildId);
}

function pause(guildId) {
  const queue = queues.get(guildId);
  if (!queue?.nowPlaying) throw new Error('Nothing is playing right now.');
  if (!queue.player.pause()) throw new Error('Already paused.');
}

function resume(guildId) {
  const queue = queues.get(guildId);
  if (!queue?.nowPlaying) throw new Error('Nothing is playing right now.');
  if (!queue.player.unpause()) throw new Error('Already playing.');
}

function setVolume(guildId, volume) {
  const queue = queues.get(guildId);
  if (!queue) throw new Error("I'm not playing anything right now.");
  queue.volume = volume;
  queue.player.state.resource?.volume?.setVolume(volume / 100);
}

function setLoop(guildId, mode) {
  const queue = queues.get(guildId);
  if (!queue) throw new Error("I'm not playing anything right now.");
  queue.loop = mode;
}

function shuffle(guildId) {
  const queue = queues.get(guildId);
  if (!queue || queue.songs.length < 2) throw new Error('Need at least 2 songs in the queue to shuffle.');
  for (let i = queue.songs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue.songs[i], queue.songs[j]] = [queue.songs[j], queue.songs[i]];
  }
}

function set247(guildId, enabled) {
  const queue = queues.get(guildId);
  if (!queue) throw new Error("I'm not connected to a voice channel right now.");
  queue.stay247 = enabled;
  if (enabled) clearTimers(queue);
}

module.exports = {
  getQueue,
  addToQueue,
  skip,
  stop,
  pause,
  resume,
  setVolume,
  setLoop,
  shuffle,
  set247,
  formatDuration,
  progressBar,
  sourceEmoji,
  destroyQueue,
  EMPTY_CHANNEL_TIMEOUT_MS
};
