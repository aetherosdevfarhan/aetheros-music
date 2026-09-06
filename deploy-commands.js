require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');

const commandsDir = path.join(__dirname, 'commands');
const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));
const commands = files.map(f => require(path.join(commandsDir, f)).data.toJSON());

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`[AETHEROS MUSIC] Deploying ${commands.length} slash command(s)...`);

    if (process.env.DEV_GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.DEV_GUILD_ID),
        { body: commands }
      );
      console.log(`[AETHEROS MUSIC] Deployed to guild ${process.env.DEV_GUILD_ID} (instant).`);
    } else {
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
      console.log('[AETHEROS MUSIC] Deployed globally (can take up to 1 hour to appear).');
    }
  } catch (err) {
    console.error('[AETHEROS MUSIC] Failed to deploy commands:', err);
  }
})();
