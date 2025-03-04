
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('softban')
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
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

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
      const days = interaction.options.getInteger('days');

      // Confirmation embed
      const confirmEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **SOFTBAN CONFIRMATION**')
        .setDescription(`***Are you sure you want to softban __${user.tag}__?***`)
        .addFields(
          { name: '**User**', value: `<@${user.id}>`, inline: true },
          { name: '**Reason**', value: `\`${reason}\``, inline: true },
          { name: '**Delete Messages**', value: `\`${days} days\``, inline: true },
          { name: '**<:PurpleLine:1336946927282950165> Note**', value: '> A softban will ban and immediately unban the user, deleting their messages.' }
        )
        .setColor(0x9B59B6)
        .setFooter({ text: 'ERLC Alting Support' })
        .setTimestamp();

      // Create proper Discord.js components
      const confirmRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('softban_confirm')
            .setLabel('Confirm')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅'),
          new ButtonBuilder()
            .setCustomId('softban_cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌')
        );

      const confirmMessage = await interaction.editReply({ 
        embeds: [confirmEmbed], 
        components: [confirmRow]
      });

      // Create a filter and await response
      const filter = i => (i.customId === 'softban_confirm' || i.customId === 'softban_cancel') && 
                         i.user.id === interaction.user.id;

      try {
        const confirmation = await interaction.channel.awaitMessageComponent({ 
          filter, 
          time: 30000 
        });

        if (confirmation.customId === 'softban_cancel') {
          const cancelEmbed = new EmbedBuilder()
            .setTitle('Softban Cancelled')
            .setDescription(`The softban for ${user.tag} has been cancelled.`)
            .setColor(0x9B59B6)
            .setFooter({ text: 'ERLC Alting Support' });

          await confirmation.update({ 
            embeds: [cancelEmbed], 
            components: [] 
          });
          return;
        }

        await confirmation.update({ 
          content: '⏳ Processing softban...', 
          embeds: [], 
          components: [] 
        });

        // Try to DM the user before softbanning
        try {
          const dmEmbed = new EmbedBuilder()
            .setTitle(`You have been softbanned from ${interaction.guild.name}`)
            .setDescription(`A moderator has softbanned you from the server.`)
            .addFields(
              { name: 'Reason', value: reason },
              { name: 'Softbanned by', value: interaction.user.tag },
              { name: 'Note', value: 'A softban removes your recent messages but you can rejoin the server immediately.' }
            )
            .setColor(0x9B59B6)
            .setFooter({ text: 'ERLC Alting Support' })
            .setTimestamp();

          await user.send({ embeds: [dmEmbed] });
        } catch (dmError) {
          console.error(`Could not send DM to ${user.tag}:`, dmError);
        }

        // Perform the softban
        await interaction.guild.members.ban(user.id, { 
          deleteMessageDays: days, 
          reason: `Softban: ${reason} | By: ${interaction.user.tag}` 
        });

        await interaction.guild.members.unban(user.id, 
          `Softban (automatic unban) | By: ${interaction.user.tag}`
        );

        // Create success embed
        const successEmbed = new EmbedBuilder()
          .setTitle('<:purplearrow:1337594384631332885> **USER SOFTBANNED**')
          .setDescription(`***${user.tag} has been softbanned successfully.***`)
          .addFields(
            { name: '**User**', value: `<@${user.id}>`, inline: true },
            { name: '**Moderator**', value: `${interaction.user}`, inline: true },
            { name: '**Reason**', value: `\`${reason}\``, inline: false },
            { name: '**Messages Deleted**', value: `\`${days} days\``, inline: true }
          )
          .setColor(0x9B59B6)
          .setFooter({ text: 'ERLC Alting Support' })
          .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed], components: [] });

        // Log to a webhook if configured
        try {
          const webhookUrl = process.env.LOG_WEBHOOK_URL || 'https://discord.com/api/webhooks/1346305081678757978/91mevrNJ8estfsvHZOpLOQU_maUJhqElxUpUGqqXS0VLWZe3o_UCVqiG7inceETjSL09';
          const { WebhookClient } = require('discord.js');
          const webhook = new WebhookClient({ url: webhookUrl });
          
          const logEmbed = new EmbedBuilder()
            .setTitle('User Softbanned')
            .setDescription(`A user has been softbanned from the server.`)
            .addFields(
              { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
              { name: 'Moderator', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
              { name: 'Reason', value: reason, inline: false },
              { name: 'Messages Deleted', value: `${days} days`, inline: true }
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
          .setDescription(`The softban confirmation has timed out.`)
          .setColor(0x9B59B6)
          .setFooter({ text: 'ERLC Alting Support' });

        await interaction.editReply({ 
          embeds: [timeoutEmbed], 
          components: [] 
        });
      }

    } catch (error) {
      console.error('Error with softban command:', error);
      await interaction.editReply('❌ There was an error executing the softban command!');
    }
  }
};
