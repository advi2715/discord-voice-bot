const { ChannelType, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { createInterface } = require('../utils/interface');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        // We need the guild from either state; prefer newState if available, else oldState
        const guild = newState.guild;
        const member = newState.member;
        const user = member.user;

        // 1. CHECK IF JOINING GENERATOR
        if (newState.channelId) {
            // Get generator channel settings for this guild
            const stmt = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?');
            const settings = stmt.get(guild.id);

            // If a generator channel is set up and the user joined it
            if (settings && newState.channelId === settings.generator_channel_id) {
                try {
                    // Check if category exists
                    const category = settings.category_id ? guild.channels.cache.get(settings.category_id) : null;
                    const { allowed_role_id } = settings;

                    const permissionOverwrites = [
                        {
                            id: user.id,
                            allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers, PermissionFlagsBits.Connect],
                        },
                        {
                            id: newState.client.user.id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels],
                        }
                    ];

                    if (allowed_role_id) {
                        permissionOverwrites.push({
                            id: guild.id,
                            deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
                        });
                        permissionOverwrites.push({
                            id: allowed_role_id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
                        });
                    } else {
                        permissionOverwrites.push({
                            id: guild.id,
                            allow: [PermissionFlagsBits.Connect],
                        });
                    }

                    const newChannel = await guild.channels.create({
                        name: `${user.username}'s Channel`,
                        type: ChannelType.GuildVoice,
                        parent: category ? category.id : null,
                        userLimit: 25,
                        permissionOverwrites
                    });

                    // Save to DB
                    const insert = db.prepare('INSERT INTO active_channels (channel_id, owner_id, guild_id) VALUES (?, ?, ?)');
                    insert.run(newChannel.id, user.id, guild.id);

                    // Move member to the new channel
                    await member.voice.setChannel(newChannel);

                    // Send Interface
                    const interfaceConfig = createInterface();
                    await newChannel.send(interfaceConfig);

                } catch (error) {
                    console.error('Error creating voice channel:', error);
                }
            }
        }

        // 2. CHECK IF LEAVING (Auto-Delete)
        // If the user left a channel (oldState.channelId is present)
        if (oldState.channelId) {
             // Check if the channel they left was a temporary one
             const stmt = db.prepare('SELECT * FROM active_channels WHERE channel_id = ?');
             const channelRecord = stmt.get(oldState.channelId);

             if (channelRecord) {
                 const channel = oldState.channel;
                 // If channel is empty (members.size === 0), delete it
                 if (channel && channel.members.size === 0) {
                     try {
                         await channel.delete();
                         db.prepare('DELETE FROM active_channels WHERE channel_id = ?').run(channel.id);
                     } catch (error) {
                         console.error('Error deleting voice channel:', error);
                     }
                 }
             }
        }
    }
};
