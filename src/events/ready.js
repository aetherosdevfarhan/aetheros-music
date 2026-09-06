const { ActivityType, Events } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`[AETHEROS MUSIC] Logged in as ${client.user.tag}`);
    const prefix = process.env.PREFIX || '#';
    client.user.setPresence({
      activities: [{ name: `${prefix}play | /play`, type: ActivityType.Listening }],
      status: 'online'
    });
  }
};
