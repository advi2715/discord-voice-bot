require('dotenv').config();
const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages
    ]
});

client.commands = new Collection();

// Load Commands
const setupCommand = require('./commands/setup.js');
client.commands.set(setupCommand.data.name, setupCommand);

// Load Events
const interactionCreate = require('./events/interactionCreate.js');
client.on(interactionCreate.name, (...args) => interactionCreate.execute(...args));

const voiceStateUpdate = require('./events/voiceStateUpdate.js');
client.on(voiceStateUpdate.name, (...args) => voiceStateUpdate.execute(...args));

// Register slash commands with Discord API, then start the bot
async function start() {
    try {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        const commands = [setupCommand.data.toJSON()];
        console.log('Refreshing application (/) commands...');
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Failed to register commands (bot will still start):', error);
    }

    await client.login(process.env.DISCORD_TOKEN);
}

client.once('clientReady', () => {
    console.log('Bot is online!');
});

// Graceful shutdown — prevents Railway from reporting SIGTERM as a crash
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    client.destroy();
    process.exit(0);
});

start();

module.exports = client;
