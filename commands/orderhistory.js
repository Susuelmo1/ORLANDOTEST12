const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('orderhistory')
    .setDescription('View order history for a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check (leave empty for yourself)')
        .setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Check if user has staff role or is owner (for checking others)
      const staffRoleId = process.env.STAFF_ROLE_ID || '1336741474708230164';
      const isStaff = interaction.member.roles.cache.has(staffRoleId);
      const ownersIds = ['523693281541095424', '1011347151021953145'];
      const isOwner = ownersIds.includes(interaction.user.id);

      const targetUser = interaction.options.getUser('user') || interaction.user;

      // If checking someone else's history, require staff or owner permissions
      if (targetUser.id !== interaction.user.id && !isStaff && !isOwner) {
        return interaction.editReply('❌ You can only view your own order history!');
      }

      // Check if user has any order history
      if (!global.userOrderHistory || !global.userOrderHistory.has(targetUser.id)) {
        return interaction.editReply(`${targetUser.id === interaction.user.id ? 'You have' : 'This user has'} no order history yet.`);
      }

      const orderHistory = global.userOrderHistory.get(targetUser.id);

      // Create an embed to display order history
      const historyEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **ORDER HISTORY**')
        .setDescription(`***Order history for ${targetUser}***`)
        .setColor(0x9B59B6)
        .setTimestamp();

      if (orderHistory.length === 0) {
        historyEmbed.addFields({ 
          name: 'No Orders Found', 
          value: 'This user has no previous orders.' 
        });
      } else {
        // Sort by most recent first
        const sortedHistory = [...orderHistory].sort((a, b) => 
          new Date(b.generatedAt) - new Date(a.generatedAt)
        );

        // Only show the 10 most recent orders to avoid embed limits
        const recentOrders = sortedHistory.slice(0, 10);

        recentOrders.forEach((order, index) => {
          const orderDate = new Date(order.generatedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });

          const expirationDate = new Date(order.expirationDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });

          historyEmbed.addFields({ 
            name: `**Order #${index + 1} - ${orderDate}**`, 
            value: `> **Package:** \`${order.package}\`\n> **Order ID:** \`${order.orderId}\`\n> **Key:** \`||${order.key}||\`\n> **Expires:** \`${expirationDate}\`` 
          });
        });

        if (sortedHistory.length > 10) {
          historyEmbed.setFooter({ 
            text: `Showing 10 most recent orders out of ${sortedHistory.length} total orders` 
          });
        }
      }

      await interaction.editReply({ embeds: [historyEmbed] });

      // Log the lookup for security
      if (targetUser.id !== interaction.user.id) {
        try {
          const webhookUrl = process.env.LOG_WEBHOOK_URL || 'https://discord.com/api/webhooks/1346305081678757978/91mevrNJ8estfsvHZOpLOQU_maUJhqElxUpUGqqXS0VLWZe3o_UCVqiG7inceETjSL09';
          const { WebhookClient } = require('discord.js');
          const webhook = new WebhookClient({ url: webhookUrl });

          const logEmbed = new EmbedBuilder()
            .setTitle('Order History Lookup')
            .setDescription(`${interaction.user.tag} looked up order history for ${targetUser.tag}`)
            .addFields(
              { name: 'Staff Member', value: `<@${interaction.user.id}>`, inline: true },
              { name: 'Target User', value: `<@${targetUser.id}>`, inline: true },
              { name: 'Channel', value: `<#${interaction.channel.id}>`, inline: false }
            )
            .setColor(0x9B59B6)
            .setTimestamp();

          await webhook.send({ embeds: [logEmbed] });
        } catch (webhookError) {
          console.error('Error sending webhook:', webhookError);
        }
      }

    } catch (error) {
      console.error('Error with orderhistory command:', error);
      await interaction.editReply('❌ There was an error retrieving order history! Please try again.');
    }
  }
};