require('dotenv').config();
const http = require('node:http');
const { Client, GatewayIntentBits } = require('discord.js');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');

// Dummy HTTP server so free-tier hosts (Render, etc.) that require a bound port for health
// checks don't kill the process. Harmless if your host doesn't need it.
const port = process.env.PORT || 3000;
http.createServer((req, res) => res.end('AETHEROS MUSIC is running.')).listen(port, () => {
  console.log(`[AETHEROS MUSIC] Health check server listening on port ${port}`);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

loadCommands(client);
loadEvents(client);

const token = process.env.DISCORD_TOKEN;
console.log(`[DEBUG] Token exists: ${!!token}`);
console.log(`[DEBUG] Token length: ${token ? token.length : 0}`);

if (!token) {
  console.error('[AETHEROS MUSIC] DISCORD_TOKEN is missing from .env — the bot cannot start.');
  process.exit(1);
}
if (!process.env.CLIENT_ID) {
  console.warn('[AETHEROS MUSIC] CLIENT_ID is missing from .env — slash command deployment (npm run deploy) will fail.');
}

client.login(token);
