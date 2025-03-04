
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('User to ban')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for the ban')
        .setRequired(true))
    .addIntegerOption(option => 
      option.setName('days')
        .setDescription('Number of days of messages to delete (0-7)')
        .setMinValue(0)
        .setMaxValue(7))
    .addStringOption(option => 
      option.setName('duration')
        .setDescription('Duration of the ban (e.g., 1d, 7d, 30d, or "permanent")'))
    .addChannelOption(option => 
      option.setName('log_channel')
        .setDescription('Channel to log the ban'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction, client) {
    await interaction.deferReply();

    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const days = interaction.options.getInteger('days') || 0;
    const duration = interaction.options.getString('duration') || 'permanent';
    const logChannel = interaction.options.getChannel('log_channel');

    // Confirmation embed
    const confirmEmbed = new EmbedBuilder()
      .setTitle('Ban Confirmation')
      .setDescription(`Are you sure you want to ban **${user.tag}**?`)
      .addFields(
        { name: 'User', value: `<@${user.id}>`, inline: true },
        { name: 'Reason', value: reason, inline: true },
        { name: 'Delete Messages', value: `${days} days`, inline: true },
        { name: 'Duration', value: duration, inline: true }
      )
      .setColor('#FF0000')
      .setTimestamp();

    const confirmRow = {
      type: 1,
      components: [
        {
          type: 2,
          style: 3,
          label: 'Confirm',
          custom_id: 'ban_confirm'
        },
        {
          type: 2,
          style: 4,
          label: 'Cancel',
          custom_id: 'ban_cancel'
        }
      ]
    };

    const confirmMessage = await interaction.editReply({ embeds: [confirmEmbed], components: [confirmRow] });

    try {
      const confirmInteraction = await confirmMessage.awaitMessageComponent({ 
        filter: i => i.user.id === interaction.user.id,
        time: 30000 
      });

      if (confirmInteraction.customId === 'ban_cancel') {
        await confirmInteraction.update({ content: '❌ Ban cancelled.', embeds: [], components: [] });
        return;
      }

      await confirmInteraction.update({ content: '⏳ Processing ban...', embeds: [], components: [] });

      try {
        const member = await interaction.guild.members.fetch(user.id);

        // DM the user before banning
        try {
          const dmEmbed = new EmbedBuilder()
            .setTitle(`You have been banned from ${interaction.guild.name}`)
            .addFields(
              { name: 'Reason', value: reason },
              { name: 'Duration', value: duration },
              { name: 'Banned by', value: interaction.user.tag }
            )
            .setColor('#FF0000')
            .setTimestamp();

          await user.send({ embeds: [dmEmbed] });
        } catch (error) {
          console.log(`Could not send DM to ${user.tag}`);
        }

        await member.ban({ deleteMessageDays: days, reason: `${reason} | By: ${interaction.user.tag}` });

        // Create log
        const banEmbed = new EmbedBuilder()
          .setTitle('User Banned')
          .addFields(
            { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
            { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
            { name: 'Reason', value: reason },
            { name: 'Duration', value: duration },
            { name: 'Deleted Messages', value: `${days} days` }
          )
          .setColor('#FF0000')
          .setTimestamp();

        // Send to specified log channel if provided
        if (logChannel) {
          await logChannel.send({ embeds: [banEmbed] });
        }

        // Log to webhook if set
        if (process.env.LOG_WEBHOOK_URL) {
          const { WebhookClient } = require('discord.js');
          const webhook = new WebhookClient({ url: process.env.LOG_WEBHOOK_URL });
          await webhook.send({ embeds: [banEmbed] });
        }

        await interaction.editReply({ content: `✅ Successfully banned **${user.tag}** | Reason: ${reason}` });

      } catch (error) {
        console.error('Error banning user:', error);
        await interaction.editReply({ content: `❌ Failed to ban ${user.tag}: ${error.message}` });
      }

    } catch (error) {
      console.error('Confirmation timed out or error:', error);
      await interaction.editReply({ content: '❌ Ban confirmation timed out or was cancelled.', embeds: [], components: [] });
    }
  }
};
