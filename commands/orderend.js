
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('orderend')
    .setDescription('End an active order and log the completion')
    .addStringOption(option => 
      option.setName('orderid')
        .setDescription('The order ID to complete')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('satisfaction')
        .setDescription('Customer satisfaction rating (1-5)')
        .setRequired(true)
        .addChoices(
          { name: '⭐ Poor', value: 1 },
          { name: '⭐⭐ Fair', value: 2 },
          { name: '⭐⭐⭐ Good', value: 3 },
          { name: '⭐⭐⭐⭐ Very Good', value: 4 },
          { name: '⭐⭐⭐⭐⭐ Excellent', value: 5 }
        ))
    .addStringOption(option =>
      option.setName('notes')
        .setDescription('Additional notes about the order completion')
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

      const orderId = interaction.options.getString('orderid');
      const satisfaction = interaction.options.getInteger('satisfaction');
      const notes = interaction.options.getString('notes') || 'No additional notes';

      // Check if order exists and is active
      if (!global.activeOrders || !global.activeOrders.has(orderId)) {
        return interaction.editReply(`❌ Order with ID \`${orderId}\` not found or not active!`);
      }

      const orderData = global.activeOrders.get(orderId);
      const targetUserId = orderData.userId;
      
      // Calculate duration
      const startTime = new Date(orderData.startTime);
      const endTime = new Date();
      const durationMs = endTime - startTime;
      const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
      const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      
      // Update order in user history
      if (global.userOrderHistory && global.userOrderHistory.has(targetUserId)) {
        const userHistory = global.userOrderHistory.get(targetUserId);
        const orderIndex = userHistory.findIndex(order => order.orderId === orderId && order.active);
        
        if (orderIndex !== -1) {
          userHistory[orderIndex].active = false;
          userHistory[orderIndex].endTime = endTime;
          userHistory[orderIndex].actualDuration = {
            hours: durationHours,
            minutes: durationMinutes
          };
          userHistory[orderIndex].satisfaction = satisfaction;
          userHistory[orderIndex].completedBy = interaction.user.id;
          userHistory[orderIndex].notes = notes;
          
          global.userOrderHistory.set(targetUserId, userHistory);
        }
      }
      
      // Remove from active orders
      global.activeOrders.delete(orderId);
      
      // Update shift stats if applicable
      if (global.staffShifts && global.staffShifts.has(interaction.user.id)) {
        const shiftData = global.staffShifts.get(interaction.user.id);
        if (shiftData.active) {
          shiftData.totals.orders += 1;
          shiftData.totals.botsDeployed += orderData.botsCount || 0;
          global.staffShifts.set(interaction.user.id, shiftData);
        }
      }

      // Create completion embed
      const completionEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **ORDER COMPLETED**')
        .setDescription(`***Order \`${orderId}\` has been completed***`)
        .addFields(
          { name: '**Customer**', value: `<@${targetUserId}>`, inline: true },
          { name: '**Staff Member**', value: `${interaction.user}`, inline: true },
          { name: '**Duration**', value: `${durationHours}h ${durationMinutes}m`, inline: true },
          { name: '**Satisfaction**', value: '⭐'.repeat(satisfaction), inline: true },
          { name: '**Notes**', value: notes, inline: false }
        )
        .setColor(0x9B59B6)
        .setTimestamp()
        .setFooter({ text: 'ERLC Alting Support' });

      // Log to webhook
      try {
        const { WebhookClient } = require('discord.js');
        const orderWebhook = new WebhookClient({ url: 'https://discord.com/api/webhooks/1346648189117272174/QK2jHQDKoDwxM4Ec-3gdnDEfsjHj8vGRFuM5tFwdYL-WKAi3TiOYwMVi0ok8wZOEsAML' });
        
        const webhookEmbed = new EmbedBuilder()
          .setTitle('✅ Order Completed')
          .setDescription(`Order ID: \`${orderId}\` has been completed`)
          .addFields(
            { name: 'Customer', value: `<@${targetUserId}>`, inline: true },
            { name: 'Staff Member', value: `${interaction.user}`, inline: true },
            { name: 'Satisfaction', value: '⭐'.repeat(satisfaction), inline: true },
            { name: 'Duration', value: `${durationHours}h ${durationMinutes}m`, inline: true },
            { name: 'Bots Count', value: `${orderData.botsCount || 'N/A'}`, inline: true },
            { name: 'End Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
            { name: 'Notes', value: notes, inline: false }
          )
          .setColor(0x00FFAA)
          .setTimestamp();
        
        await orderWebhook.send({ embeds: [webhookEmbed] });
      } catch (webhookError) {
        console.error('Error sending to order webhook:', webhookError);
      }

      // Send success message
      await interaction.editReply({ embeds: [completionEmbed] });

    } catch (error) {
      console.error('Error completing order:', error);
      await interaction.editReply('❌ There was an error completing the order! Please try again or contact an administrator.');
    }
  }
};
