const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('orderend')
    .setDescription('End an active order')
    .addStringOption(option =>
      option.setName('orderid')
        .setDescription('The order ID to end')
        .setRequired(true))
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user who placed the order')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for ending the order')
        .setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();

    try {
      // Check staff permissions
      const staffRoleId = process.env.STAFF_ROLE_ID || '1336741474708230164';
      const isStaff = interaction.member.roles.cache.has(staffRoleId);
      const ownersIds = ['523693281541095424', '1011347151021953145'];
      const isOwner = ownersIds.includes(interaction.user.id);

      if (!isStaff && !isOwner) {
        return interaction.editReply('❌ **You do not have permission to use this command!**');
      }

      const orderId = interaction.options.getString('orderid');
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';

      // Check if order exists
      if (!global.activeOrders || !global.activeOrders.has(orderId)) {
        return interaction.editReply(`❌ **Order ID ${orderId} not found or already completed!**`);
      }

      // Get order data
      const orderData = global.activeOrders.get(orderId);

      // Mark order as ended
      orderData.endTime = new Date();
      orderData.endReason = reason;
      orderData.active = false;
      orderData.endedBy = interaction.user.id;

      // Remove from active orders
      global.activeOrders.delete(orderId);

      // Update order in history
      if (global.userOrderHistory && global.userOrderHistory.has(orderData.userId)) {
        const userHistory = global.userOrderHistory.get(orderData.userId);

        for (const order of userHistory) {
          if (order.orderId === orderId) {
            order.endTime = new Date();
            order.endReason = reason;
            order.active = false;
            order.endedBy = interaction.user.id;
            break;
          }
        }

        global.userOrderHistory.set(orderData.userId, userHistory);
      }

      // Send confirmation embed
      const endEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **ORDER ENDED**')
        .setDescription(`***Order ${orderId} has been ended***`)
        .addFields(
          { name: '**Order ID**', value: `\`${orderId}\``, inline: true },
          { name: '**User**', value: `${user}`, inline: true },
          { name: '**Ended By**', value: `${interaction.user}`, inline: true },
          { name: '**Duration**', value: `<t:${Math.floor(orderData.startTime.getTime() / 1000)}:R>`, inline: true },
          { name: '**Reason**', value: reason, inline: false }
        )
        .setColor(0x9B59B6)
        .setTimestamp();

      await interaction.editReply({ embeds: [endEmbed] });

      // Send to order ends channel
      try {
        const orderEndsChannelId = '1346696797132951642';
        const orderEndsChannel = client.channels.cache.get(orderEndsChannelId);

        if (orderEndsChannel) {
          const notificationEmbed = new EmbedBuilder()
            .setTitle('<:purplearrow:1337594384631332885> **ORDER ENDED**')
            .setDescription(`***Order ${orderId} has been ended***`)
            .addFields(
              { name: '**Order ID**', value: `\`${orderId}\``, inline: true },
              { name: '**User**', value: `${user}`, inline: true },
              { name: '**Ended By**', value: `${interaction.user}`, inline: true },
              { name: '**Duration**', value: `<t:${Math.floor(orderData.startTime.getTime() / 1000)}:R>`, inline: true },
              { name: '**Accounts**', value: `\`${orderData.accountsCount || 'Unknown'}\``, inline: true },
              { name: '**Reason**', value: reason, inline: false }
            )
            .setColor(0x9B59B6)
            .setTimestamp();

          await orderEndsChannel.send({ embeds: [notificationEmbed] });
        }
      } catch (channelError) {
        console.error('Error sending to order ends channel:', channelError);
      }

      // Log to webhook
      try {
        const webhookUrl = process.env.LOG_WEBHOOK_URL || 'https://discord.com/api/webhooks/1346305081678757978/91mevrNJ8estfsvHZOpLOQU_maUJhqElxUpUGqqXS0VLWZe3o_UCVqiG7inceETjSL09';
        const { WebhookClient } = require('discord.js');
        const webhook = new WebhookClient({ url: webhookUrl });

        const logEmbed = new EmbedBuilder()
          .setTitle('Order Ended')
          .setDescription(`Order ${orderId} has been ended`)
          .addFields(
            { name: 'Order ID', value: `\`${orderId}\``, inline: true },
            { name: 'User', value: `${user.tag} (<@${user.id}>)`, inline: true },
            { name: 'Ended By', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
            { name: 'Duration', value: `<t:${Math.floor(orderData.startTime.getTime() / 1000)}:R>`, inline: true },
            { name: 'Reason', value: reason, inline: false }
          )
          .setColor(0x9B59B6)
          .setTimestamp();

        await webhook.send({ embeds: [logEmbed] });
      } catch (webhookError) {
        console.error('Error sending webhook:', webhookError);
      }

    } catch (error) {
      console.error('Error ending order:', error);
      await interaction.editReply('❌ **There was an error ending this order! Please try again or contact an administrator.**');
    }
  }
};