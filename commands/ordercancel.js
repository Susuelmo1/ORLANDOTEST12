
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
        .setRequired(true))
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User associated with the order (optional)')
        .setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();

    try {
      const staffRoleId = process.env.STAFF_ROLE_ID || '1336741474708230164';
      const isStaff = interaction.member.roles.cache.has(staffRoleId);
      const ownersIds = ['523693281541095424', '1011347151021953145'];
      const isOwner = ownersIds.includes(interaction.user.id);

      if (!isStaff && !isOwner) {
        return interaction.editReply('❌ You do not have permission to use this command!');
      }

      const identifier = interaction.options.getString('identifier');
      const reason = interaction.options.getString('reason');
      const specifiedUser = interaction.options.getUser('user');

      // Check if identifier is an order ID or a key
      let orderId = null;
      let key = null;
      let orderData = null;
      
      // Try to find by order ID first
      if (global.activeOrders && global.activeOrders.has(identifier)) {
        orderId = identifier;
        orderData = global.activeOrders.get(orderId);
      } 
      // If not found, check if it's a key
      else if (global.generatedKeys && global.generatedKeys.has(identifier)) {
        key = identifier;
        const keyData = global.generatedKeys.get(key);
        
        // Try to find associated order
        if (global.activeOrders) {
          for (const [id, data] of global.activeOrders.entries()) {
            if (data.key === key) {
              orderId = id;
              orderData = data;
              break;
            }
          }
        }
      }

      // If neither found, return error
      if (!orderData) {
        return interaction.editReply(`❌ No active order found with ID or key \`${identifier}\`!`);
      }

      // Get user associated with the order
      let targetUser;
      try {
        // Use specified user if provided, otherwise try to get from order data
        if (specifiedUser) {
          targetUser = specifiedUser;
        } else if (orderData.userId) {
          targetUser = await client.users.fetch(orderData.userId);
        }
      } catch (userError) {
        console.error('Error fetching order user:', userError);
        // Continue without user if can't be fetched
      }

      // Create cancellation embed
      const cancellationEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **ORDER CANCELLED**')
        .setDescription(`***The order has been cancelled***`)
        .addFields(
          { name: '**Order ID**', value: `\`${orderId}\``, inline: true },
          { name: '**Cancelled By**', value: `${interaction.user}`, inline: true },
          { name: '**Reason**', value: `\`${reason}\``, inline: false }
        )
        .setColor(0x9B59B6)
        .setTimestamp()
        .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png')
        .setFooter({ text: 'ERLC Alting Support' });

      // Add user and key information if available
      if (targetUser) {
        cancellationEmbed.addFields({ name: '**Customer**', value: `${targetUser}`, inline: true });
      }
      
      if (key || orderData.key) {
        cancellationEmbed.addFields({ name: '**Key**', value: `\`${key || orderData.key}\``, inline: true });
      }

      // Remove from active orders
      if (orderId && global.activeOrders) {
        global.activeOrders.delete(orderId);
      }

      // Update user order history
      if (targetUser && global.userOrderHistory && global.userOrderHistory.has(targetUser.id)) {
        const userHistory = global.userOrderHistory.get(targetUser.id);
        const orderIndex = userHistory.findIndex(order => 
          (order.orderId === orderId || order.key === key) && order.active
        );
        
        if (orderIndex !== -1) {
          userHistory[orderIndex].active = false;
          userHistory[orderIndex].cancelledAt = new Date();
          userHistory[orderIndex].cancelledBy = interaction.user.id;
          userHistory[orderIndex].cancellationReason = reason;
          
          global.userOrderHistory.set(targetUser.id, userHistory);
        }
      }

      // Mark key as cancelled if it exists
      if (key && global.generatedKeys && global.generatedKeys.has(key)) {
        const keyData = global.generatedKeys.get(key);
        keyData.cancelled = true;
        keyData.cancelledAt = new Date();
        keyData.cancelledBy = interaction.user.id;
        keyData.cancellationReason = reason;
        
        global.generatedKeys.set(key, keyData);
      }

      // Send cancellation log to webhook
      const webhookEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **ORDER CANCELLED**')
        .setDescription(`***An order has been cancelled***`)
        .addFields(
          { name: '**Order ID**', value: `\`${orderId}\``, inline: true },
          { name: '**Staff Member**', value: `<@${interaction.user.id}>`, inline: true },
          { name: '**Cancellation Time**', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
          { name: '**Reason**', value: `\`${reason}\``, inline: false }
        )
        .setColor(0x9B59B6)
        .setTimestamp()
        .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png');

      // Add user to webhook if available
      if (targetUser) {
        webhookEmbed.addFields({ name: '**Customer**', value: `<@${targetUser.id}>`, inline: true });
      }
      
      // Add key to webhook if available
      if (key || orderData.key) {
        webhookEmbed.addFields({ name: '**Key**', value: `\`${key || orderData.key}\``, inline: true });
      }

      // Send to webhook
      sendWebhook('https://discord.com/api/webhooks/1346648189117272174/QK2jHQDKoDwxM4Ec-3gdnDEfsjHj8vGRFuM5tFwdYL-WKAi3TiOYwMVi0ok8wZOEsAML', { embeds: [webhookEmbed] });

      // Reply with cancellation confirmation
      await interaction.editReply({ embeds: [cancellationEmbed] });

      // Try to notify the user about the cancellation
      if (targetUser) {
        try {
          const userEmbed = new EmbedBuilder()
            .setTitle('<:purplearrow:1337594384631332885> **YOUR ORDER HAS BEEN CANCELLED**')
            .setDescription(`***Your order has been cancelled by a staff member***`)
            .addFields(
              { name: '**Order ID**', value: `\`${orderId}\``, inline: true },
              { name: '**Reason**', value: `\`${reason}\``, inline: false },
              { name: '**<:PurpleLine:1336946927282950165> Next Steps**', value: 'If you believe this was in error, please open a new support ticket.' }
            )
            .setColor(0x9B59B6)
            .setTimestamp()
            .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png')
            .setFooter({ text: 'ERLC Alting Support' });

          await targetUser.send({ embeds: [userEmbed] });
        } catch (dmError) {
          console.error('Could not send DM to user about cancellation:', dmError);
        }
      }

    } catch (error) {
      console.error('Error cancelling order:', error);
      await interaction.editReply('❌ There was an error cancelling the order! Please try again or contact an administrator.');
    }
  }
};
