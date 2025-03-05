
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { sendWebhook } = require('../utils/webhook');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('orderend')
    .setDescription('End an active order and log the completion')
    .addStringOption(option => 
      option.setName('orderid')
        .setDescription('The order ID to complete')
        .setRequired(true))
    .addUserOption(option => 
      option.setName('user1')
        .setDescription('First user to log time for')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('duration1')
        .setDescription('Duration in minutes for user 1')
        .setRequired(true))
    .addUserOption(option => 
      option.setName('user2')
        .setDescription('Second user to log time for (optional)')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('duration2')
        .setDescription('Duration in minutes for user 2')
        .setRequired(false))
    .addUserOption(option => 
      option.setName('user3')
        .setDescription('Third user to log time for (optional)')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('duration3')
        .setDescription('Duration in minutes for user 3')
        .setRequired(false))
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
      const notes = interaction.options.getString('notes') || 'No additional notes';

      // Check if order exists and is active
      if (!global.activeOrders || !global.activeOrders.has(orderId)) {
        return interaction.editReply(`❌ Order with ID \`${orderId}\` not found or not active!`);
      }

      const orderData = global.activeOrders.get(orderId);
      
      // Get user information
      const user1 = interaction.options.getUser('user1');
      const duration1 = interaction.options.getInteger('duration1');
      const user2 = interaction.options.getUser('user2');
      const duration2 = interaction.options.getInteger('duration2');
      const user3 = interaction.options.getUser('user3');
      const duration3 = interaction.options.getInteger('duration3');
      
      // Calculate order total duration
      const startTime = new Date(orderData.startTime);
      const endTime = new Date();
      const totalDurationMs = endTime - startTime;
      const totalHours = Math.floor(totalDurationMs / (1000 * 60 * 60));
      const totalMinutes = Math.floor((totalDurationMs % (1000 * 60 * 60)) / (1000 * 60));
      
      // Prepare user duration fields
      const userFields = [];
      
      userFields.push({
        name: `**${user1.username}'s Duration**`,
        value: `\`${Math.floor(duration1 / 60)}h ${duration1 % 60}m\``,
        inline: true
      });
      
      if (user2 && duration2) {
        userFields.push({
          name: `**${user2.username}'s Duration**`,
          value: `\`${Math.floor(duration2 / 60)}h ${duration2 % 60}m\``,
          inline: true
        });
      }
      
      if (user3 && duration3) {
        userFields.push({
          name: `**${user3.username}'s Duration**`,
          value: `\`${Math.floor(duration3 / 60)}h ${duration3 % 60}m\``,
          inline: true
        });
      }
      
      // Update order in user history
      if (global.userOrderHistory && global.userOrderHistory.has(orderData.userId)) {
        const userHistory = global.userOrderHistory.get(orderData.userId);
        const orderIndex = userHistory.findIndex(order => order.orderId === orderId && order.active);
        
        if (orderIndex !== -1) {
          userHistory[orderIndex].active = false;
          userHistory[orderIndex].endTime = endTime;
          userHistory[orderIndex].actualDuration = {
            hours: totalHours,
            minutes: totalMinutes
          };
          userHistory[orderIndex].completedBy = interaction.user.id;
          userHistory[orderIndex].participantDurations = [
            { userId: user1.id, duration: duration1 },
            user2 ? { userId: user2.id, duration: duration2 } : null,
            user3 ? { userId: user3.id, duration: duration3 } : null
          ].filter(Boolean);
          userHistory[orderIndex].notes = notes;
          
          global.userOrderHistory.set(orderData.userId, userHistory);
        }
      }
      
      // Remove from active orders
      global.activeOrders.delete(orderId);
      
      // Create completion embed
      const completionEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **ORDER COMPLETED**')
        .setDescription(`***Order \`${orderId}\` has been completed***`)
        .addFields(
          { name: '**Customer**', value: `<@${orderData.userId}>`, inline: true },
          { name: '**Staff Member**', value: `${interaction.user}`, inline: true },
          { name: '**Total Duration**', value: `${totalHours}h ${totalMinutes}m`, inline: true },
          ...userFields,
          { name: '**Notes**', value: notes, inline: false }
        )
        .setColor(0x9B59B6)
        .setTimestamp()
        .setFooter({ text: 'ERLC Alting Support' });

      // Prepare webhook participants field
      const participantsField = {
        name: 'Participants',
        value: `${user1} (${Math.floor(duration1 / 60)}h ${duration1 % 60}m)` +
          (user2 ? `\n${user2} (${Math.floor(duration2 / 60)}h ${duration2 % 60}m)` : '') +
          (user3 ? `\n${user3} (${Math.floor(duration3 / 60)}h ${duration3 % 60}m)` : ''),
        inline: false
      };

      // Log to webhook
      const webhookEmbed = new EmbedBuilder()
        .setTitle('✅ Order Completed')
        .setDescription(`Order ID: \`${orderId}\` has been completed`)
        .addFields(
          { name: 'Customer', value: `<@${orderData.userId}>`, inline: true },
          { name: 'Staff Member', value: `${interaction.user}`, inline: true },
          { name: 'Total Duration', value: `${totalHours}h ${totalMinutes}m`, inline: true },
          { name: 'Bots Count', value: `${orderData.botsCount || 'N/A'}`, inline: true },
          participantsField,
          { name: 'End Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
          { name: 'Notes', value: notes, inline: false }
        )
        .setColor(0x00FFAA)
        .setTimestamp();
      
      // Send to webhook
      sendWebhook('https://discord.com/api/webhooks/1346648189117272174/QK2jHQDKoDwxM4Ec-3gdnDEfsjHj8vGRFuM5tFwdYL-WKAi3TiOYwMVi0ok8wZOEsAML', { embeds: [webhookEmbed] });

      // Send success message
      await interaction.editReply({ embeds: [completionEmbed] });

    } catch (error) {
      console.error('Error completing order:', error);
      await interaction.editReply('❌ There was an error completing the order! Please try again or contact an administrator.');
    }
  }
};
