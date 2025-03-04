
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Ban and immediately unban a user to delete their messages')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('User to softban')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for the softban')
        .setRequired(true))
    .addIntegerOption(option => 
      option.setName('days')
        .setDescription('Number of days of messages to delete (1-7)')
        .setMinValue(1)
        .setMaxValue(7)
        .setRequired(true))
    .addChannelOption(option => 
      option.setName('log_channel')
        .setDescription('Channel to log the softban'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction, client) {
    await interaction.deferReply();

    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const days = interaction.options.getInteger('days');
    const logChannel = interaction.options.getChannel('log_channel');

    // Confirmation embed
    const confirmEmbed = new EmbedBuilder()
      .setTitle('Softban Confirmation')
      .setDescription(`Are you sure you want to softban **${user.tag}**?`)
      .addFields(
        { name: 'User', value: `<@${user.id}>`, inline: true },
        { name: 'Reason', value: reason, inline: true },
        { name: 'Delete Messages', value: `${days} days`, inline: true }
      )
      .setColor('#FF6347')
      .setFooter({ text: 'A softban will ban and immediately unban the user, deleting their messages.' })
      .setTimestamp();

    const confirmRow = {
      type: 1,
      components: [
        {
          type: 2,
          style: 3,
          label: 'Confirm',
          custom_id: 'softban_confirm'
        },
        {
          type: 2,
          style: 4,
          label: 'Cancel',
          custom_id: 'softban_cancel'
        }
      ]
    };

    const confirmMessage = await interaction.editReply({ embeds: [confirmEmbed], components: [confirmRow] });

    try {
      const confirmInteraction = await confirmMessage.awaitMessageComponent({ 
        filter: i => i.user.id === interaction.user.id,
        time: 30000 
      });

      if (confirmInteraction.customId === 'softban_cancel') {
        await confirmInteraction.update({ content: '❌ Softban cancelled.', embeds: [], components: [] });
        return;
      }

      await confirmInteraction.update({ content: '⏳ Processing softban...', embeds: [], components: [] });

      try {
        const member = await interaction.guild.members.fetch(user.id);

        // DM the user before softbanning
        try {
          const dmEmbed = new EmbedBuilder()
            .setTitle(`You have been softbanned from ${interaction.guild.name}`)
            .addFields(
              { name: 'Reason', value: reason },
              { name: 'Softbanned by', value: interaction.user.tag },
              { name: 'Note', value: 'A softban removes your recent messages but you can rejoin the server immediately.' }
            )
            .setColor('#FF6347')
            .setTimestamp();

          await user.send({ embeds: [dmEmbed] });
        } catch (error) {
          console.log(`Could not send DM to ${user.tag}`);
        }

        // Ban then unban
        await interaction.guild.members.ban(user.id, { deleteMessageDays: days, reason: `Softban: ${reason} | By: ${interaction.user.tag}` });
        await interaction.guild.members.unban(user.id, `Softban (automatic unban) | By: ${interaction.user.tag}`);

        // Create log
        const softbanEmbed = new EmbedBuilder()
          .setTitle('User Softbanned')
          .addFields(
            { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
            { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
            { name: 'Reason', value: reason },
            { name: 'Deleted Messages', value: `${days} days` }
          )
          .setColor('#FF6347')
          .setTimestamp();

        // Send to specified log channel if provided
        if (logChannel) {
          await logChannel.send({ embeds: [softbanEmbed] });
        }

        // Log to webhook if set
        if (process.env.LOG_WEBHOOK_URL) {
          const { WebhookClient } = require('discord.js');
          const webhook = new WebhookClient({ url: process.env.LOG_WEBHOOK_URL });
          await webhook.send({ embeds: [softbanEmbed] });
        }

        await interaction.editReply({ content: `✅ Successfully softbanned **${user.tag}** | Reason: ${reason}` });

      } catch (error) {
        console.error('Error softbanning user:', error);
        await interaction.editReply({ content: `❌ Failed to softban ${user.tag}: ${error.message}` });
      }

    } catch (error) {
      console.error('Confirmation timed out or error:', error);
      await interaction.editReply({ content: '❌ Softban confirmation timed out or was cancelled.', embeds: [], components: [] });
    }
  }
};
