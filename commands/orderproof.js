const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const crypto = require('crypto');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('orderproof')
    .setDescription('Submit your order proof')
    .addStringOption(option => 
      option.setName('roblox_username')
        .setDescription('Your Roblox username')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('screenshot')
        .setDescription('URL to screenshot of your purchase (must be an image URL)')
        .setRequired(true)),

  async execute(interaction, client) {
    await interaction.deferReply();

    try {
      // Verify this is being used in a ticket channel
      const ticketChannel = interaction.channel;
      if (!ticketChannel.name.includes('ticket') && 
          !ticketChannel.name.includes('order') && 
          !ticketChannel.name.includes('support') && 
          !ticketChannel.name.includes('vip')) {
        return interaction.editReply('❌ This command can only be used in a ticket channel!');
      }

      const robloxUsername = interaction.options.getString('roblox_username');
      const screenshotUrl = interaction.options.getString('screenshot');

      // Very basic URL validation
      if (!screenshotUrl.startsWith('http') || 
          (!screenshotUrl.includes('.png') && 
           !screenshotUrl.includes('.jpg') && 
           !screenshotUrl.includes('.jpeg') && 
           !screenshotUrl.includes('.gif'))) {
        return interaction.editReply('❌ Please provide a valid image URL (ending with .png, .jpg, .jpeg, or .gif)');
      }

      // Create order proof embed
      const orderProofEmbed = new EmbedBuilder()
        .setTitle('📝 Order Proof Submission')
        .setDescription(`Order proof submitted by ${interaction.user}`)
        .addFields(
          { name: 'Roblox Username', value: robloxUsername, inline: true },
          { name: 'Submitted By', value: `${interaction.user.tag}`, inline: true },
          { name: 'Date', value: new Date().toLocaleString(), inline: true },
          { name: 'Instructions', value: 'Please take a screenshot of your order and upload it where requested.', inline: false }
        )
        .setImage(screenshotUrl)
        .setColor(0x9B59B6)
        .setFooter({ text: 'ERLC Alting Support' });

      // Create verification buttons for staff
      const verifyButtons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('verify_order_proof')
            .setLabel('Verify Proof')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅'),
          new ButtonBuilder()
            .setCustomId('reject_order_proof')
            .setLabel('Reject Proof')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌')
        );

      // Generate a unique ID for this order proof
      const orderId = Math.random().toString(36).substring(2, 10).toUpperCase();

      // Store order proof details if we have a global map (can be adapted for database use)
      if (!client.orderProofs) {
        client.orderProofs = new Map();
      }

      client.orderProofs.set(orderId, {
        robloxUsername,
        screenshotUrl,
        userId: interaction.user.id,
        timestamp: Date.now()
      });

      const staffRoleId = process.env.STAFF_ROLE_ID || '1336741474708230164';

      // Send the embed with verification buttons
      await interaction.editReply({
        content: `<@&${staffRoleId}> Order proof submitted! Order ID: \`${orderId}\``,
        embeds: [orderProofEmbed],
        components: [verifyButtons]
      });

      // Send a DM to the user with confirmation
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle('🧾 Order Proof Received')
          .setDescription('Your order proof has been submitted successfully!')
          .addFields(
            { name: 'Order ID', value: orderId, inline: true },
            { name: 'Status', value: 'Pending verification', inline: true },
            { name: 'Next Steps', value: 'A staff member will verify your proof shortly. Please wait in your ticket channel.' }
          )
          .setColor(0x9B59B6)
          .setFooter({ text: 'ERLC Alting Support' });

        await interaction.user.send({ embeds: [dmEmbed] });
      } catch (dmError) {
        console.error('Could not send DM to user:', dmError);
        // Continue if we can't DM - it's not critical
      }

    } catch (error) {
      console.error('Error with order proof command:', error);

      let errorMessage = '❌ There was an error processing your order proof. Please contact a staff member for assistance.';

      if (error.message) {
        if (error.message.includes('URL')) {
          errorMessage = '❌ There was an error with your screenshot URL. Please make sure it\'s a valid, accessible image link.';
        } else if (error.message.includes('permission')) {
          errorMessage = '❌ I don\'t have permission to perform this action. Please contact a staff member.';
        }
      }

      await interaction.editReply(errorMessage);
    }
  }
};