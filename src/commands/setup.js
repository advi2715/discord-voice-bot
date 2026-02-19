const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const db = require('../db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Creates the Join-to-Create voice channel system')
        .addRoleOption(option => 
            option.setName('role')
                .setDescription('Optional: Restrict access to a specific role')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        try {
            const guild = interaction.guild;
            const role = interaction.options.getRole('role');

            const permissionOverwrites = [
                {
                    id: guild.members.me.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels],
                }
            ];

            if (role) {
                permissionOverwrites.push(
                    {
                        id: guild.id, // @everyone
                        deny: [PermissionFlagsBits.ViewChannel],
                    },
                    {
                        id: role.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
                    }
                );
            } else {
                 permissionOverwrites.push({
                    id: guild.id, // @everyone
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
                });
            }
            
            // Create Category
            const category = await guild.channels.create({
                name: 'Voice Channels',
                type: ChannelType.GuildCategory,
                permissionOverwrites: permissionOverwrites
            });

            // Create Generator Channel
            const generator = await guild.channels.create({
                name: 'Join to Create',
                type: ChannelType.GuildVoice,
                parent: category.id,
                permissionOverwrites: permissionOverwrites
            });

            // Save to DB
            const stmt = db.prepare('INSERT OR REPLACE INTO guild_settings (guild_id, generator_channel_id, category_id, allowed_role_id) VALUES (?, ?, ?, ?)');
            stmt.run(guild.id, generator.id, category.id, role ? role.id : null);

            await interaction.reply({ content: `Setup complete! Generator channel created: ${generator.toString()}${role ? ` (Restricted to ${role.toString()})` : ''}`, ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    },
};
