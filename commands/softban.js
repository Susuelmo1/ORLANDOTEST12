const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('softban')
    .setDescription('Softban a user (ban and immediately unban to clear messages)')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to softban')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for the softban')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('days')
        .setDescription('Number of days of messages to delete (1-7)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(7)),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Check if user has staff role
      const staffRoleId = process.env.STAFF_ROLE_ID || '1336741474708230164';
      const isStaff = interaction.member.roles.cache.has(staffRoleId);
      const ownersIds = ['523693281541095424', '1011347151021953145'];
      const isOwner = ownersIds.includes(interaction.user.id);

      if (!isStaff && !isOwner) {
        return interaction.editReply('❌ You do not have permission to use this command!');
      }

      const targetUser = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const days = interaction.options.getInteger('days') || 1;

      // Check if the user is in the server
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!member) {
        return interaction.editReply('❌ This user is not in the server!');
      }

      // Check if the user is moderatable
      if (!member.moderatable) {
        return interaction.editReply("❌ I don't have permission to softban this user!");
      }

      // Create softban embed
      const softbanEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **USER SOFTBANNED**')
        .setDescription(`***${targetUser.tag} has been softbanned by ${interaction.user.tag}***`)
        .addFields(
          { name: '**User**', value: `<@${targetUser.id}>`, inline: true },
          { name: '**Moderator**', value: `<@${interaction.user.id}>`, inline: true },
          { name: '**Reason**', value: `\`${reason}\``, inline: false },
          { name: '**Note**', value: `A softban removes your recent messages but you can rejoin the server when you are calm. Your ticket will be placed at the end of the queue when you return.`, inline: false }
        )
        .setColor(0x9B59B6)
        .setTimestamp();

      // Try to DM the user before softbanning
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle('<:purplearrow:1337594384631332885> **YOU HAVE BEEN SOFTBANNED**')
          .setDescription(`***You have been softbanned from ${interaction.guild.name}***`)
          .addFields(
            { name: '**Reason**', value: `\`${reason}\``, inline: false },
            { name: '**Moderator**', value: `${interaction.user.tag}`, inline: true },
            { name: '**Note**', value: `A softban removes your recent messages. You can rejoin the server when you are calm. Your ticket will be placed at the end of the queue when you return.`, inline: false }
          )
          .setColor(0x9B59B6)
          .setTimestamp();

        await targetUser.send({ embeds: [dmEmbed] }).catch(() => {
          console.log(`Could not send DM to ${targetUser.tag}`);
        });
      } catch (dmError) {
        console.error('Error sending DM:', dmError);
      }

      // Perform the softban
      await interaction.guild.members.ban(targetUser, { days, reason: `Softban by ${interaction.user.tag}: ${reason}` });
      await interaction.guild.members.unban(targetUser, `Softban by ${interaction.user.tag}: ${reason}`);

      // Log to channel
      const logChannelId = process.env.MOD_LOG_CHANNEL_ID || '1346305973622673478';
      try {
        const logChannel = await interaction.guild.channels.fetch(logChannelId);
        if (logChannel) {
          await logChannel.send({ embeds: [softbanEmbed] });
        }
      } catch (logError) {
        console.error('Error sending to log channel:', logError);
      }

      // Log to webhook
      try {
        const webhookUrl = process.env.LOG_WEBHOOK_URL || 'https://discord.com/api/webhooks/1346305081678757978/91mevrNJ8estfsvHZOpLOQU_maUJhqElxUpUGqqXS0VLWZe3o_UCVqiG7inceETjSL09';
        const { WebhookClient } = require('discord.js');
        const webhook = new WebhookClient({ url: webhookUrl });

        await webhook.send({ embeds: [softbanEmbed] });
      } catch (webhookError) {
        console.error('Error sending webhook:', webhookError);
      }

      // Success message
      await interaction.editReply(`✅ Successfully softbanned ${targetUser.tag}!`);

    } catch (error) {
      console.error('Error softbanning user:', error);
      await interaction.editReply('❌ There was an error softbanning the user!');
    }
  }
};