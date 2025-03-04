
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user from the server')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('User to kick')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for the kick')
        .setRequired(true))
    .addChannelOption(option => 
      option.setName('log_channel')
        .setDescription('Channel to log the kick'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction, client) {
    await interaction.deferReply();

    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const logChannel = interaction.options.getChannel('log_channel');

    // Confirmation embed
    const confirmEmbed = new EmbedBuilder()
      .setTitle('Kick Confirmation')
      .setDescription(`Are you sure you want to kick **${user.tag}**?`)
      .addFields(
        { name: 'User', value: `<@${user.id}>`, inline: true },
        { name: 'Reason', value: reason, inline: true }
      )
      .setColor('#FFA500')
      .setTimestamp();

    const confirmRow = {
      type: 1,
      components: [
        {
          type: 2,
          style: 3,
          label: 'Confirm',
          custom_id: 'kick_confirm'
        },
        {
          type: 2,
          style: 4,
          label: 'Cancel',
          custom_id: 'kick_cancel'
        }
      ]
    };

    const confirmMessage = await interaction.editReply({ embeds: [confirmEmbed], components: [confirmRow] });

    try {
      const confirmInteraction = await confirmMessage.awaitMessageComponent({ 
        filter: i => i.user.id === interaction.user.id,
        time: 30000 
      });

      if (confirmInteraction.customId === 'kick_cancel') {
        await confirmInteraction.update({ content: '❌ Kick cancelled.', embeds: [], components: [] });
        return;
      }

      await confirmInteraction.update({ content: '⏳ Processing kick...', embeds: [], components: [] });

      try {
        const member = await interaction.guild.members.fetch(user.id);

        // DM the user before kicking
        try {
          const dmEmbed = new EmbedBuilder()
            .setTitle(`You have been kicked from ${interaction.guild.name}`)
            .addFields(
              { name: 'Reason', value: reason },
              { name: 'Kicked by', value: interaction.user.tag }
            )
            .setColor('#FFA500')
            .setTimestamp();

          await user.send({ embeds: [dmEmbed] });
        } catch (error) {
          console.log(`Could not send DM to ${user.tag}`);
        }

        await member.kick(`${reason} | By: ${interaction.user.tag}`);

        // Create log
        const kickEmbed = new EmbedBuilder()
          .setTitle('User Kicked')
          .addFields(
            { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
            { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
            { name: 'Reason', value: reason }
          )
          .setColor('#FFA500')
          .setTimestamp();

        // Send to specified log channel if provided
        if (logChannel) {
          await logChannel.send({ embeds: [kickEmbed] });
        }

        // Log to webhook if set
        if (process.env.LOG_WEBHOOK_URL) {
          const { WebhookClient } = require('discord.js');
          const webhook = new WebhookClient({ url: process.env.LOG_WEBHOOK_URL });
          await webhook.send({ embeds: [kickEmbed] });
        }

        await interaction.editReply({ content: `✅ Successfully kicked **${user.tag}** | Reason: ${reason}` });

      } catch (error) {
        console.error('Error kicking user:', error);
        await interaction.editReply({ content: `❌ Failed to kick ${user.tag}: ${error.message}` });
      }

    } catch (error) {
      console.error('Confirmation timed out or error:', error);
      await interaction.editReply({ content: '❌ Kick confirmation timed out or was cancelled.', embeds: [], components: [] });
    }
  }
};
