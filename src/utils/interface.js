const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');

function createInterface() {
    const embed = new EmbedBuilder()
        .setTitle('Channel Controls')
        .setDescription('Use the dropdowns below to manage your channel.')
        .setColor(0x0099FF);

    const settingsMenu = new StringSelectMenuBuilder()
        .setCustomId('channel_settings')
        .setPlaceholder('🔧 Channel Settings...')
        .addOptions(
            { label: 'Lock', value: 'lock', emoji: '🔒', description: 'Prevent new users from joining' },
            { label: 'Unlock', value: 'unlock', emoji: '🔓', description: 'Allow users to join' },
            { label: 'Hide', value: 'hide', emoji: '👻', description: 'Make channel invisible' },
            { label: 'Unhide', value: 'unhide', emoji: '👁️', description: 'Make channel visible' },
            { label: 'Rename', value: 'rename', emoji: '✏️', description: 'Rename the channel' },
            { label: 'Set User Limit', value: 'limit', emoji: '👥', description: 'Set max users (1-25)' },
        );

    const userMenu = new StringSelectMenuBuilder()
        .setCustomId('user_actions')
        .setPlaceholder('👥 User Actions...')
        .addOptions(
            { label: 'Kick User', value: 'kick', emoji: '🚫', description: 'Kick a user from your channel' },
            { label: 'Transfer Ownership', value: 'transfer', emoji: '👑', description: 'Give ownership to another user' },
            { label: 'Invite User', value: 'invite', emoji: '📩', description: 'Invite a server member' },
            { label: 'Claim Channel', value: 'claim', emoji: '🙋', description: 'Claim if owner has left' },
        );

    const row1 = new ActionRowBuilder().addComponents(settingsMenu);
    const row2 = new ActionRowBuilder().addComponents(userMenu);

    return { embeds: [embed], components: [row1, row2] };
}

module.exports = { createInterface };
