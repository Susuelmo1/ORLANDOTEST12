
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('softban')
    .setDescription('Ban and immediately unban a user to delete their messages')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to softban')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for softban')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('days')
        .setDescription('Number of days of messages to delete (1-7)')
        .setMinValue(1)
        .setMaxValue(7)
        .setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Check permissions
      const staffRoleId = process.env.STAFF_ROLE_ID || '1336741474708230164';
      const isStaff = interaction.member.roles.cache.has(staffRoleId);

      if (!isStaff) {
        return interaction.editReply('❌ You do not have permission to use this command!');
      }

      const targetUser = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const days = interaction.options.getInteger('days') || 1;

      // Get member from user
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

      if (!member) {
        return interaction.editReply('❌ Unable to find this user in the server.');
      }

      // Check if the bot can ban the user
      if (!member.bannable) {
        return interaction.editReply('❌ I cannot ban this user. They may have higher permissions than me.');
      }

      // Ban the user
      await interaction.guild.members.ban(targetUser, { reason: `Softban: ${reason}`, deleteMessageDays: days });

      // Unban the user
      await interaction.guild.members.unban(targetUser, 'Softban completed: Messages deleted');

      const softbanEmbed = new EmbedBuilder()
        .setTitle('User Softbanned')
        .setDescription(`${targetUser.tag} has been softbanned.`)
        .addFields(
          { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true },
          { name: 'Reason', value: reason, inline: false },
          { name: 'Days of Messages Deleted', value: days.toString(), inline: true }
        )
        .setColor(0x9B59B6)
        .setTimestamp()
        .setFooter({ text: 'ERLC Alting Support' });

      await interaction.editReply({ embeds: [softbanEmbed] });

      // Log to a mod log channel if available
      const modLogChannelId = process.env.MOD_LOG_CHANNEL || '';
      if (modLogChannelId) {
        const modLogChannel = await interaction.guild.channels.fetch(modLogChannelId).catch(() => null);
        if (modLogChannel) {
          await modLogChannel.send({ embeds: [softbanEmbed] });
        }
      }

    } catch (error) {
      console.error('Error executing softban command:', error);
      await interaction.editReply('❌ There was an error executing the softban command! Please try again or contact an administrator.');
    }
  }
};
