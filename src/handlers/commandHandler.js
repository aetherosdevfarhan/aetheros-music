const fs = require('node:fs');
const path = require('node:path');
const { Collection } = require('discord.js');

function loadCommands(client) {
  client.commands = new Collection();
  const commandsDir = path.join(__dirname, '..', 'commands');
  const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const command = require(path.join(commandsDir, file));
    if (command?.data?.name && typeof command.execute === 'function') {
      client.commands.set(command.data.name, command);
    } else {
      console.warn(`[AETHEROS MUSIC] Skipping invalid command file: ${file}`);
    }
  }
  console.log(`[AETHEROS MUSIC] Loaded ${client.commands.size} slash command(s).`);
}

module.exports = { loadCommands };
