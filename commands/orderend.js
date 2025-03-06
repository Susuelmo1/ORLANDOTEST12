const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { logOrderCompletion } = require('../utils/webhook');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('orderend')
    .setDescription('Mark an order as complete and end the service')
    .addStringOption(option =>
      option.setName('orderid')
        .setDescription('The Order ID to end')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for ending the order')
        .setRequired(true)
        .addChoices(
          { name: 'Complete - Service finished successfully', value: 'complete' },
          { name: 'Expired - Service duration ended', value: 'expired' },
          { name: 'Cancelled - Customer request', value: 'cancelled' },
          { name: 'Cancelled - TOS violation', value: 'tos_violation' },
          { name: 'Cancelled - Payment issue', value: 'payment_issue' },
          { name: 'Other (specify in notes)', value: 'other' }
        ))
    .addStringOption(option =>
      option.setName('notes')
        .setDescription('Additional notes about the order end (optional)'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction, client) {
    await interaction.deferReply();

    try {
      // Check if user has staff role
      const staffRoleId = process.env.STAFF_ROLE_ID || '1336741474708230164';
      const member = interaction.member;
      const ownersIds = ['523693281541095424', '1011347151021953145'];
      const hasStaffRole = member.roles.cache.has(staffRoleId);
      const isOwner = ownersIds.includes(interaction.user.id);

      if (!hasStaffRole && !isOwner) {
        return interaction.editReply('❌ Only staff members can use this command!');
      }

      const orderId = interaction.options.getString('orderid');
      const reason = interaction.options.getString('reason');
      const notes = interaction.options.getString('notes') || 'No additional notes.';

      // Check if the order exists
      if (!global.activeOrders || !global.activeOrders.has(orderId)) {
        return interaction.editReply(`❌ Order ID \`${orderId}\` was not found in active orders.`);
      }

      // Get order data
      const orderData = global.activeOrders.get(orderId);
      const userId = orderData.userId;
      const product = orderData.product || 'Unknown Product';
      const startDate = orderData.startDate || new Date();
      const endDate = new Date();
      const duration = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)); // Duration in days

      // Try to get the user
      const user = await client.users.fetch(userId).catch(() => null);
      const username = user ? user.tag : 'Unknown User';

      // Get readable reason
      let readableReason = '';
      switch (reason) {
        case 'complete':
          readableReason = 'Service completed successfully';
          break;
        case 'expired':
          readableReason = 'Service duration expired';
          break;
        case 'cancelled':
          readableReason = 'Cancelled at customer request';
          break;
        case 'tos_violation':
          readableReason = 'Cancelled due to Terms of Service violation';
          break;
        case 'payment_issue':
          readableReason = 'Cancelled due to payment issue';
          break;
        case 'other':
          readableReason = `Other reason: ${notes}`;
          break;
        default:
          readableReason = reason;
      }

      // Create embed for order end
      const orderEndEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **ORDER COMPLETED**')
        .setDescription(`***Order \`${orderId}\` has been marked as completed***`)
        .addFields(
          { name: '**Customer**', value: user ? `${username} (<@${userId}>)` : username, inline: true },
          { name: '**Product**', value: product, inline: true },
          { name: '**Duration**', value: `${duration} days`, inline: true },
          { name: '**Order ID**', value: `\`${orderId}\``, inline: true },
          { name: '**Status**', value: '✅ Completed', inline: true },
          { name: '**Reason**', value: readableReason, inline: true }
        )
        .setColor(0x9B59B6)
        .setTimestamp();

      if (notes && reason !== 'other') {
        orderEndEmbed.addFields({ name: '**Additional Notes**', value: notes, inline: false });
      }

      // Send the embed to the channel
      await interaction.editReply({ embeds: [orderEndEmbed] });

      // Move user's ticket to appropriate category if we can
      try {
        // Default ticket categories
        const generalSupportCategoryId = '1337555581199978546';
        const unpaidCategoryId = '1337558917789519914';

        // Try to find the user's ticket
        const guild = interaction.guild;
        const userTickets = guild.channels.cache.filter(
          channel => 
            channel.name.includes('order') && 
            channel.name.includes(user ? user.username.toLowerCase() : '')
        );

        if (userTickets.size > 0) {
          const ticketChannel = userTickets.first();

          // Determine which category to move to
          let targetCategoryId = generalSupportCategoryId; // Default to general support
          if (reason === 'payment_issue') {
            targetCategoryId = unpaidCategoryId; // Move to unpaid if payment issue
          }

          // Move the channel
          await ticketChannel.setParent(targetCategoryId, { lockPermissions: false });

          // Log the move
          console.log(`Moved ticket ${ticketChannel.name} to category ${targetCategoryId}`);
        }
      } catch (moveError) {
        console.error('Error moving ticket to category:', moveError);
      }

      // Log to webhook
      try {
        await logOrderCompletion({
          title: 'ORDER ENDED',
          description: `Order ${orderId} has been completed`,
          fields: [
            { name: 'Customer', value: user ? `${username} (<@${userId}>)` : username, inline: true },
            { name: 'Product', value: product, inline: true },
            { name: 'Duration', value: `${duration} days`, inline: true },
            { name: 'Order ID', value: `\`${orderId}\``, inline: true },
            { name: 'Status', value: '✅ Completed', inline: true },
            { name: 'Reason', value: readableReason, inline: true },
            { name: 'Staff Member', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true }
          ]
        });
      } catch (webhookError) {
        console.error('Error logging to webhook:', webhookError);
      }

      // Try to notify the user
      if (user) {
        try {
          const userEmbed = new EmbedBuilder()
            .setTitle('<:purplearrow:1337594384631332885> **YOUR ORDER HAS ENDED**')
            .setDescription(`***Your order with ID \`${orderId}\` has been completed***`)
            .addFields(
              { name: '**Order ID**', value: `\`${orderId}\``, inline: true },
              { name: '**Product**', value: product, inline: true },
              { name: '**Status**', value: '✅ Completed', inline: true },
              { name: '**Reason**', value: readableReason, inline: false },
              { name: '**<:PurpleLine:1336946927282950165> Need Help?**', value: 'If you need any further assistance, please open a support ticket.' }
            )
            .setColor(0x9B59B6)
            .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png')
            .setTimestamp();

          await user.send({ embeds: [userEmbed] }).catch(() => {
            console.log(`Could not send DM to user ${userId}`);
          });
        } catch (dmError) {
          console.error('Error sending DM:', dmError);
        }
      }

      // Remove from active orders map
      global.activeOrders.delete(orderId);

      // Add to order history
      if (!global.userOrderHistory) {
        global.userOrderHistory = new Map();
      }

      const userHistory = global.userOrderHistory.get(userId) || [];
      userHistory.push({
        orderId,
        product,
        startDate,
        endDate,
        reason: readableReason,
        staffId: interaction.user.id
      });
      global.userOrderHistory.set(userId, userHistory);

    } catch (error) {
      console.error('Error ending order:', error);
      await interaction.editReply('❌ There was an error ending the order! Please try again or contact an administrator.');
    }
  }
};