require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages
    ]
});

client.commands = new Collection();

// Load Commands manually (since we only have one for now)
const setupCommand = require('./commands/setup.js');
client.commands.set(setupCommand.data.name, setupCommand);

// Load Events
const interactionCreate = require('./events/interactionCreate.js');
client.on(interactionCreate.name, (...args) => interactionCreate.execute(...args));

const voiceStateUpdate = require('./events/voiceStateUpdate.js');
client.on(voiceStateUpdate.name, (...args) => voiceStateUpdate.execute(...args));

client.once('ready', () => {
    console.log('Bot is online!');
});

client.login(process.env.DISCORD_TOKEN);

// Graceful shutdown — prevents Railway from reporting SIGTERM as a crash
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    client.destroy();
    process.exit(0);
});

module.exports = client;
