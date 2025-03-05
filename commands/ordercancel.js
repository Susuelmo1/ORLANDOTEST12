const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { sendWebhook } = require('../utils/webhook');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ordercancel')
    .setDescription('Cancel an active order')
    .addStringOption(option => 
      option.setName('identifier')
        .setDescription('Order ID or Key to cancel')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for cancellation')
        .setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();

    try {
      // Check if user has staff role
      const staffRoleId = process.env.STAFF_ROLE_ID || '1336741474708230164';
      const isStaff = interaction.member.roles.cache.has(staffRoleId);
      const ownersIds = ['523693281541095424', '1011347151021953145'];
      const isOwner = ownersIds.includes(interaction.user.id);

      if (!isStaff && !isOwner) {
        return interaction.editReply('❌ You do not have permission to use this command!');
      }

      const identifier = interaction.options.getString('identifier');
      const reason = interaction.options.getString('reason') || 'No reason provided';

      // Check if this is a key or an order ID
      let orderId = identifier;
      let orderData = null;

      // If this appears to be a key (longer alphanumeric string), look for it in generated keys
      if (identifier.length > 10) {
        if (global.generatedKeys && global.generatedKeys.has(identifier)) {
          const keyInfo = global.generatedKeys.get(identifier);
          orderId = keyInfo.orderId;
        }
      }

      // Look for the order in active orders
      if (global.activeOrders && global.activeOrders.has(orderId)) {
        orderData = global.activeOrders.get(orderId);
      } else {
        return interaction.editReply(`❌ Could not find active order with ID/Key: \`${identifier}\``);
      }

      // Get user details
      const userId = orderData.userId;
      let user;
      try {
        user = await client.users.fetch(userId);
      } catch (error) {
        console.error('Error fetching user:', error);
        user = { tag: 'Unknown User', id: userId };
      }

      // Mark order as inactive in user history
      if (global.userOrderHistory && global.userOrderHistory.has(userId)) {
        const userHistory = global.userOrderHistory.get(userId);
        const orderIndex = userHistory.findIndex(order => order.orderId === orderId);

        if (orderIndex !== -1) {
          userHistory[orderIndex].active = false;
          userHistory[orderIndex].cancelledAt = new Date();
          userHistory[orderIndex].cancelledBy = interaction.user.id;
          userHistory[orderIndex].cancelReason = reason;

          global.userOrderHistory.set(userId, userHistory);
        }
      }

      // Remove from active orders
      global.activeOrders.delete(orderId);

      // Create cancellation embed
      const cancelEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **ORDER CANCELLED**')
        .setDescription(`***Order has been cancelled by ${interaction.user}***`)
        .addFields(
          { name: '**Order ID**', value: `\`${orderId}\``, inline: true },
          { name: '**User**', value: `<@${userId}>`, inline: true },
          { name: '**Staff Member**', value: `<@${interaction.user.id}>`, inline: true },
          { name: '**Cancel Time**', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
          { name: '**Reason**', value: `\`${reason}\``, inline: false }
        )
        .setColor(0x9B59B6)
        .setTimestamp();

      // Send to webhook
      sendWebhook('https://discord.com/api/webhooks/1346648189117272174/QK2jHQDKoDwxM4Ec-3gdnDEfsjHj8vGRFuM5tFwdYL-WKAi3TiOYwMVi0ok8wZOEsAML', { embeds: [cancelEmbed] });

      // Notify the user if possible
      try {
        const userEmbed = new EmbedBuilder()
          .setTitle('<:purplearrow:1337594384631332885> **YOUR ORDER HAS BEEN CANCELLED**')
          .setDescription(`***Your order with ID \`${orderId}\` has been cancelled***`)
          .addFields(
            { name: '**Reason**', value: `\`${reason}\``, inline: false },
            { name: '**<:PurpleLine:1336946927282950165> Next Steps**', value: 'If you believe this was a mistake, please open a support ticket.' }
          )
          .setColor(0x9B59B6)
          .setTimestamp();

        await user.send({ embeds: [userEmbed] }).catch(() => {
          console.log(`Could not send DM to user ${userId}`);
        });
      } catch (dmError) {
        console.error('Error sending DM:', dmError);
      }

      // Send success message in the channel
      await interaction.editReply({ embeds: [cancelEmbed] });

    } catch (error) {
      console.error('Error cancelling order:', error);
      await interaction.editReply('❌ There was an error cancelling the order! Please try again or contact an administrator.');
    }
  }
};