const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const db = require('../db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Creates the Join-to-Create voice channel system')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        try {
            const guild = interaction.guild;
            
            // Create Category
            const category = await guild.channels.create({
                name: 'Voice Channels',
                type: ChannelType.GuildCategory
            });

            // Create Generator Channel
            const generator = await guild.channels.create({
                name: 'Join to Create',
                type: ChannelType.GuildVoice,
                parent: category.id
            });

            // Save to DB
            const stmt = db.prepare('INSERT OR REPLACE INTO guild_settings (guild_id, generator_channel_id, category_id) VALUES (?, ?, ?)');
            stmt.run(guild.id, generator.id, category.id);

            await interaction.reply({ content: `Setup complete! Generator channel created: ${generator.toString()}`, ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    },
};
