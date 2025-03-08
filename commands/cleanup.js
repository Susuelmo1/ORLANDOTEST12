
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cleanup')
    .setDescription('Clean up inactive orders and tickets (Admin only)'),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Only owners can use this command
      const ownersIds = ['523693281541095424', '1011347151021953145'];
      if (!ownersIds.includes(interaction.user.id)) {
        return interaction.editReply('❌ **Only the bot owner can use this command!**');
      }

      let cleanupReport = {
        activeOrders: 0,
        removedOrders: 0,
        activeTickets: 0,
        removedTickets: 0
      };

      // Clean up inactive orders
      if (global.activeOrders) {
        const now = new Date();
        const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000); // 7 days ago
        
        for (const [orderId, orderData] of global.activeOrders.entries()) {
          if (orderData.startTime < oneWeekAgo) {
            global.activeOrders.delete(orderId);
            cleanupReport.removedOrders++;
          } else {
            cleanupReport.activeOrders++;
          }
        }
      }

      // Clean up inactive tickets
      if (global.activeTickets) {
        const now = new Date();
        const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000); // 3 days ago
        
        for (const [ticketId, ticketData] of global.activeTickets.entries()) {
          if (ticketData.createdAt < threeDaysAgo) {
            global.activeTickets.delete(ticketId);
            cleanupReport.removedTickets++;
          } else {
            cleanupReport.activeTickets++;
          }
        }
      }

      // Send cleanup report
      const reportEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **SYSTEM CLEANUP**')
        .setDescription('***Cleanup of inactive data completed***')
        .addFields(
          { 
            name: '**Orders**', 
            value: `Active: ${cleanupReport.activeOrders}\nRemoved: ${cleanupReport.removedOrders}`,
            inline: true
          },
          { 
            name: '**Tickets**', 
            value: `Active: ${cleanupReport.activeTickets}\nRemoved: ${cleanupReport.removedTickets}`,
            inline: true
          }
        )
        .setColor(0x9B59B6)
        .setTimestamp();

      await interaction.editReply({ embeds: [reportEmbed] });

    } catch (error) {
      console.error('Error cleaning up data:', error);
      await interaction.editReply('❌ **There was an error cleaning up the data!**');
    }
  }
};
