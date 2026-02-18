const {
    Events,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    UserSelectMenuBuilder,
    ChannelType,
} = require('discord.js');
const db = require('../db');

// All custom IDs this handler manages
const managedCustomIds = [
    'channel_settings',
    'user_actions',
    'kick_target',
    'transfer_target',
    'invite_target',
    'rename_modal',
    'limit_modal',
];

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // ── Slash Commands ──────────────────────────────────────────
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                const msg = { content: 'There was an error executing this command!', ephemeral: true };
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(msg);
                } else {
                    await interaction.reply(msg);
                }
            }
            return;
        }

        // ── Only handle interactions we manage ──────────────────────
        const customId = interaction.customId;
        if (!managedCustomIds.includes(customId)) return;

        // ── Helpers ─────────────────────────────────────────────────
        function getChannelRecord(channelId) {
            return db.prepare('SELECT owner_id FROM active_channels WHERE channel_id = ?').get(channelId);
        }

        function isOwner(record, userId) {
            return record && record.owner_id === userId;
        }

        // Resolve the voice channel the user is in (interface message is
        // sent as a text message inside the voice channel).
        function getVoiceChannel(interaction) {
            const member = interaction.member;
            if (member.voice && member.voice.channel) {
                return member.voice.channel;
            }
            return interaction.channel;
        }

        // ── channel_settings dropdown ───────────────────────────────
        if (interaction.isStringSelectMenu() && customId === 'channel_settings') {
            const selected = interaction.values[0];
            const voiceChannel = getVoiceChannel(interaction);
            const record = getChannelRecord(voiceChannel.id);

            if (!record) {
                return interaction.reply({ content: 'This channel is no longer managed.', ephemeral: true });
            }
            if (!isOwner(record, interaction.user.id)) {
                return interaction.reply({ content: 'You do not own this channel.', ephemeral: true });
            }

            switch (selected) {
                case 'lock': {
                    await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: false });
                    return interaction.reply({ content: '🔒 Channel locked.', ephemeral: true });
                }
                case 'unlock': {
                    await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: true });
                    return interaction.reply({ content: '🔓 Channel unlocked.', ephemeral: true });
                }
                case 'hide': {
                    await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, { ViewChannel: false });
                    return interaction.reply({ content: '👻 Channel hidden.', ephemeral: true });
                }
                case 'unhide': {
                    await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, { ViewChannel: null });
                    return interaction.reply({ content: '👁️ Channel visible.', ephemeral: true });
                }
                case 'rename': {
                    const modal = new ModalBuilder()
                        .setCustomId('rename_modal')
                        .setTitle('Rename Channel');
                    const nameInput = new TextInputBuilder()
                        .setCustomId('new_name')
                        .setLabel('New Channel Name')
                        .setStyle(TextInputStyle.Short)
                        .setMaxLength(100)
                        .setRequired(true);
                    modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
                    return interaction.showModal(modal);
                }
                case 'limit': {
                    const modal = new ModalBuilder()
                        .setCustomId('limit_modal')
                        .setTitle('Set User Limit');
                    const limitInput = new TextInputBuilder()
                        .setCustomId('new_limit')
                        .setLabel('User Limit (1-25)')
                        .setStyle(TextInputStyle.Short)
                        .setMaxLength(2)
                        .setRequired(true);
                    modal.addComponents(new ActionRowBuilder().addComponents(limitInput));
                    return interaction.showModal(modal);
                }
            }
            return;
        }

        // ── user_actions dropdown ───────────────────────────────────
        if (interaction.isStringSelectMenu() && customId === 'user_actions') {
            const selected = interaction.values[0];
            const voiceChannel = getVoiceChannel(interaction);
            const record = getChannelRecord(voiceChannel.id);

            if (!record) {
                return interaction.reply({ content: 'This channel is no longer managed.', ephemeral: true });
            }

            // Claim is special — anyone in the channel can use it
            if (selected === 'claim') {
                // Check if the current owner is still in the voice channel
                const ownerInChannel = voiceChannel.members.has(record.owner_id);
                if (ownerInChannel) {
                    return interaction.reply({ content: 'The owner is still in the channel. You cannot claim it.', ephemeral: true });
                }
                // Check claimer is actually in the channel
                if (!voiceChannel.members.has(interaction.user.id)) {
                    return interaction.reply({ content: 'You must be in the voice channel to claim it.', ephemeral: true });
                }
                // Transfer ownership
                db.prepare('UPDATE active_channels SET owner_id = ? WHERE channel_id = ?').run(interaction.user.id, voiceChannel.id);
                return interaction.reply({ content: '🙋 You are now the owner of this channel!', ephemeral: true });
            }

            // All other user actions require ownership
            if (!isOwner(record, interaction.user.id)) {
                return interaction.reply({ content: 'You do not own this channel.', ephemeral: true });
            }

            switch (selected) {
                case 'kick': {
                    // Build a select menu of users currently in the voice channel (excluding the owner)
                    const members = voiceChannel.members.filter(m => m.id !== interaction.user.id);
                    if (members.size === 0) {
                        return interaction.reply({ content: 'No other users in the channel to kick.', ephemeral: true });
                    }
                    const options = members.map(m => ({
                        label: m.user.username,
                        value: m.id,
                        description: m.user.tag,
                    }));
                    const menu = new StringSelectMenuBuilder()
                        .setCustomId('kick_target')
                        .setPlaceholder('Select a user to kick...')
                        .addOptions(options.slice(0, 25)); // Discord max 25 options
                    const row = new ActionRowBuilder().addComponents(menu);
                    return interaction.reply({ content: 'Select a user to kick:', components: [row], ephemeral: true });
                }
                case 'transfer': {
                    const members = voiceChannel.members.filter(m => m.id !== interaction.user.id);
                    if (members.size === 0) {
                        return interaction.reply({ content: 'No other users in the channel to transfer to.', ephemeral: true });
                    }
                    const options = members.map(m => ({
                        label: m.user.username,
                        value: m.id,
                        description: m.user.tag,
                    }));
                    const menu = new StringSelectMenuBuilder()
                        .setCustomId('transfer_target')
                        .setPlaceholder('Select the new owner...')
                        .addOptions(options.slice(0, 25));
                    const row = new ActionRowBuilder().addComponents(menu);
                    return interaction.reply({ content: 'Select a user to transfer ownership to:', components: [row], ephemeral: true });
                }
                case 'invite': {
                    const menu = new UserSelectMenuBuilder()
                        .setCustomId('invite_target')
                        .setPlaceholder('Select a user to invite...');
                    const row = new ActionRowBuilder().addComponents(menu);
                    return interaction.reply({ content: 'Select a user to invite:', components: [row], ephemeral: true });
                }
            }
            return;
        }

        // ── kick_target follow-up ───────────────────────────────────
        if (interaction.isStringSelectMenu() && customId === 'kick_target') {
            const targetId = interaction.values[0];
            const voiceChannel = getVoiceChannel(interaction);
            const record = getChannelRecord(voiceChannel.id);

            if (!record || !isOwner(record, interaction.user.id)) {
                return interaction.reply({ content: 'You do not own this channel.', ephemeral: true });
            }

            const target = voiceChannel.members.get(targetId);
            if (!target) {
                return interaction.reply({ content: 'That user is no longer in the channel.', ephemeral: true });
            }

            try {
                await target.voice.disconnect('Kicked by channel owner');
                return interaction.reply({ content: `🚫 Kicked **${target.user.username}** from the channel.`, ephemeral: true });
            } catch (error) {
                console.error('Error kicking user:', error);
                return interaction.reply({ content: 'Failed to kick user.', ephemeral: true });
            }
        }

        // ── transfer_target follow-up ───────────────────────────────
        if (interaction.isStringSelectMenu() && customId === 'transfer_target') {
            const targetId = interaction.values[0];
            const voiceChannel = getVoiceChannel(interaction);
            const record = getChannelRecord(voiceChannel.id);

            if (!record || !isOwner(record, interaction.user.id)) {
                return interaction.reply({ content: 'You do not own this channel.', ephemeral: true });
            }

            const target = voiceChannel.members.get(targetId);
            if (!target) {
                return interaction.reply({ content: 'That user is no longer in the channel.', ephemeral: true });
            }

            db.prepare('UPDATE active_channels SET owner_id = ? WHERE channel_id = ?').run(targetId, voiceChannel.id);
            return interaction.reply({ content: `👑 Ownership transferred to **${target.user.username}**.`, ephemeral: true });
        }

        // ── invite_target follow-up (UserSelectMenu) ────────────────
        if (interaction.isUserSelectMenu() && customId === 'invite_target') {
            const targetId = interaction.values[0];
            const voiceChannel = getVoiceChannel(interaction);
            const record = getChannelRecord(voiceChannel.id);

            if (!record || !isOwner(record, interaction.user.id)) {
                return interaction.reply({ content: 'You do not own this channel.', ephemeral: true });
            }

            try {
                // Grant the target user Connect permission on the channel
                await voiceChannel.permissionOverwrites.edit(targetId, { Connect: true, ViewChannel: true });

                // Create an invite to the voice channel
                const invite = await voiceChannel.createInvite({
                    maxAge: 3600,    // 1 hour
                    maxUses: 1,
                    unique: true,
                });

                // Try to DM the target user
                const targetUser = await interaction.client.users.fetch(targetId);
                try {
                    await targetUser.send(`You've been invited to join **${voiceChannel.name}** in **${interaction.guild.name}**: ${invite.url}`);
                    return interaction.reply({ content: `📩 Invited **${targetUser.username}** — they've been sent a DM with the invite link.`, ephemeral: true });
                } catch {
                    // DMs might be disabled
                    return interaction.reply({ content: `📩 Invited **${targetUser.username}** — but their DMs are closed. They now have permission to join the channel.`, ephemeral: true });
                }
            } catch (error) {
                console.error('Error inviting user:', error);
                return interaction.reply({ content: 'Failed to invite user.', ephemeral: true });
            }
        }

        // ── rename_modal submit ─────────────────────────────────────
        if (interaction.isModalSubmit() && customId === 'rename_modal') {
            const voiceChannel = getVoiceChannel(interaction);
            const record = getChannelRecord(voiceChannel.id);

            if (!record || !isOwner(record, interaction.user.id)) {
                return interaction.reply({ content: 'You do not own this channel.', ephemeral: true });
            }

            const newName = interaction.fields.getTextInputValue('new_name');
            try {
                await voiceChannel.setName(newName);
                return interaction.reply({ content: `✏️ Channel renamed to **${newName}**.`, ephemeral: true });
            } catch (error) {
                console.error('Error renaming channel:', error);
                return interaction.reply({ content: 'Failed to rename channel.', ephemeral: true });
            }
        }

        // ── limit_modal submit ──────────────────────────────────────
        if (interaction.isModalSubmit() && customId === 'limit_modal') {
            const voiceChannel = getVoiceChannel(interaction);
            const record = getChannelRecord(voiceChannel.id);

            if (!record || !isOwner(record, interaction.user.id)) {
                return interaction.reply({ content: 'You do not own this channel.', ephemeral: true });
            }

            const raw = interaction.fields.getTextInputValue('new_limit');
            const limit = parseInt(raw, 10);
            if (isNaN(limit) || limit < 1 || limit > 25) {
                return interaction.reply({ content: 'Please enter a number between 1 and 25.', ephemeral: true });
            }

            try {
                await voiceChannel.setUserLimit(limit);
                return interaction.reply({ content: `👥 User limit set to **${limit}**.`, ephemeral: true });
            } catch (error) {
                console.error('Error setting user limit:', error);
                return interaction.reply({ content: 'Failed to set user limit.', ephemeral: true });
            }
        }
    },
};
