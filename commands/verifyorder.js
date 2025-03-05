
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { sendWebhook } = require('../utils/webhook');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verifyorder')
    .setDescription('Verify if bots have joined your ERLC server')
    .addStringOption(option =>
      option.setName('orderid')
        .setDescription('Your order ID')
        .setRequired(true)),

  async execute(interaction, client) {
    await interaction.deferReply();

    try {
      const orderId = interaction.options.getString('orderid');

      // Check if the order exists
      if (!global.activeOrders || !global.activeOrders.has(orderId)) {
        return interaction.editReply('❌ Could not find an active order with that ID. Please check the ID and try again.');
      }

      const orderData = global.activeOrders.get(orderId);
      
      // Check if the user is the order owner
      if (orderData.userId !== interaction.user.id) {
        return interaction.editReply('❌ This order does not belong to you.');
      }

      // Create verification embed
      const verifyEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **ORDER VERIFICATION**')
        .setDescription(`***Order ${orderId} has been verified***`)
        .addFields(
          { name: '**Order ID**', value: `\`${orderId}\``, inline: true },
          { name: '**Bots Count**', value: `\`${orderData.botsCount}\``, inline: true },
          { name: '**Status**', value: '✅ **Verified In-Game**', inline: true },
          { name: '**Server Code**', value: `\`${orderData.serverCode}\``, inline: true },
          { name: '**Join Time**', value: `<t:${Math.floor(orderData.startTime.getTime() / 1000)}:R>`, inline: true }
        )
        .setColor(0x9B59B6)
        .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png')
        .setTimestamp();

      // Add in-game verification link
      verifyEmbed.addFields({
        name: '**Verification Link**',
        value: `[Click to verify bots in-game](https://www.roblox.com/games/2534724415/Emergency-Response-Liberty-County?privateServerLinkCode=${orderData.serverCode})`,
        inline: false
      });

      // Mark order as verified in the system
      orderData.verified = true;
      global.activeOrders.set(orderId, orderData);

      // Update user's order history if it exists
      if (global.userOrderHistory && global.userOrderHistory.has(interaction.user.id)) {
        const userHistory = global.userOrderHistory.get(interaction.user.id);
        const orderIndex = userHistory.findIndex(order => order.orderId === orderId);
        
        if (orderIndex !== -1) {
          userHistory[orderIndex].verified = true;
          global.userOrderHistory.set(interaction.user.id, userHistory);
        }
      }

      // Send webhook notification
      const webhookEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **ORDER VERIFIED**')
        .setDescription(`***Order ${orderId} has been verified by ${interaction.user}***`)
        .addFields(
          { name: '**Order ID**', value: `\`${orderId}\``, inline: true },
          { name: '**Bots Count**', value: `\`${orderData.botsCount}\``, inline: true },
          { name: '**User**', value: `<@${interaction.user.id}>`, inline: true },
          { name: '**Server Code**', value: `\`${orderData.serverCode}\``, inline: true },
          { name: '**Verification Time**', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
        )
        .setColor(0x9B59B6)
        .setTimestamp();

      sendWebhook('https://discord.com/api/webhooks/1346648189117272174/QK2jHQDKoDwxM4Ec-3gdnDEfsjHj8vGRFuM5tFwdYL-WKAi3TiOYwMVi0ok8wZOEsAML', { embeds: [webhookEmbed] });

      // Reply to the user
      await interaction.editReply({ embeds: [verifyEmbed] });

    } catch (error) {
      console.error('Error verifying order:', error);
      await interaction.editReply('❌ There was an error verifying your order! Please try again or contact staff for assistance.');
    }
  }
};
