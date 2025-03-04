
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

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
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction, client) {
    await interaction.deferReply();

    try {
      // Check if user has staff role
      const staffRoleId = process.env.STAFF_ROLE_ID || '1336741474708230164';
      const isStaff = interaction.member.roles.cache.has(staffRoleId);
      const ownersIds = ['523693281541095424', '1011347151021953145'];
      const isOwner = ownersIds.includes(interaction.user.id);

      if (!isStaff && !isOwner) {
        return interaction.editReply('❌ Only staff members can use this command!');
      }

      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');

      // Confirmation embed
      const confirmEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **KICK CONFIRMATION**')
        .setDescription(`***Are you sure you want to kick __${user.tag}__?***`)
        .addFields(
          { name: '**User**', value: `<@${user.id}>`, inline: true },
          { name: '**Reason**', value: `\`${reason}\``, inline: true }
        )
        .setColor(0x9B59B6)
        .setTimestamp();

      const confirmRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('kick_confirm')
            .setLabel('Confirm')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅'),
          new ButtonBuilder()
            .setCustomId('kick_cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌')
        );

      await interaction.editReply({ embeds: [confirmEmbed], components: [confirmRow] });

      // Create a filter for buttons
      const filter = i => (i.customId === 'kick_confirm' || i.customId === 'kick_cancel') && 
                          i.user.id === interaction.user.id;

      try {
        const confirmation = await interaction.channel.awaitMessageComponent({ 
          filter, 
          time: 30000 
        });

        if (confirmation.customId === 'kick_cancel') {
          const cancelEmbed = new EmbedBuilder()
            .setTitle('Kick Cancelled')
            .setDescription(`The kick for ${user.tag} has been cancelled.`)
            .setColor(0x9B59B6)
            .setFooter({ text: 'ERLC Alting Support' });

          await confirmation.update({ 
            embeds: [cancelEmbed], 
            components: [] 
          });
          return;
        }

        await confirmation.update({ 
          content: '⏳ Processing kick...', 
          embeds: [], 
          components: [] 
        });

        // Try to DM the user before kicking
        try {
          const dmEmbed = new EmbedBuilder()
            .setTitle(`You have been kicked from ${interaction.guild.name}`)
            .setDescription(`A moderator has kicked you from the server.`)
            .addFields(
              { name: 'Reason', value: reason },
              { name: 'Kicked by', value: interaction.user.tag }
            )
            .setColor(0x9B59B6)
            .setFooter({ text: 'ERLC Alting Support' })
            .setTimestamp();

          await user.send({ embeds: [dmEmbed] });
        } catch (dmError) {
          console.error(`Could not send DM to ${user.tag}:`, dmError);
        }

        // Perform the kick
        const member = await interaction.guild.members.fetch(user.id);
        await member.kick(`${reason} | By: ${interaction.user.tag}`);

        // Create success embed
        const successEmbed = new EmbedBuilder()
          .setTitle('<:purplearrow:1337594384631332885> **USER KICKED**')
          .setDescription(`***${user.tag} has been kicked successfully.***`)
          .addFields(
            { name: '**User**', value: `<@${user.id}>`, inline: true },
            { name: '**Moderator**', value: `${interaction.user}`, inline: true },
            { name: '**Reason**', value: `\`${reason}\``, inline: false }
          )
          .setColor(0x9B59B6)
          .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed], components: [] });

        // Log to webhook
        try {
          const webhookUrl = process.env.LOG_WEBHOOK_URL || 'https://discord.com/api/webhooks/1346305081678757978/91mevrNJ8estfsvHZOpLOQU_maUJhqElxUpUGqqXS0VLWZe3o_UCVqiG7inceETjSL09';
          const { WebhookClient } = require('discord.js');
          const webhook = new WebhookClient({ url: webhookUrl });
          
          const logEmbed = new EmbedBuilder()
            .setTitle('User Kicked')
            .setDescription(`A user has been kicked from the server.`)
            .addFields(
              { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
              { name: 'Moderator', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
              { name: 'Reason', value: reason, inline: false }
            )
            .setColor(0x9B59B6)
            .setTimestamp();
            
          await webhook.send({ embeds: [logEmbed] });
        } catch (webhookError) {
          console.error('Error sending webhook:', webhookError);
        }

      } catch (timeoutError) {
        // Handle timeout
        const timeoutEmbed = new EmbedBuilder()
          .setTitle('Confirmation Timed Out')
          .setDescription(`The kick confirmation has timed out.`)
          .setColor(0x9B59B6)
          .setFooter({ text: 'ERLC Alting Support' });

        await interaction.editReply({ 
          embeds: [timeoutEmbed], 
          components: [] 
        });
      }

    } catch (error) {
      console.error('Error with kick command:', error);
      await interaction.editReply('❌ There was an error executing the kick command!');
    }
  }
};
