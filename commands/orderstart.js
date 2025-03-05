const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { sendWebhook } = require('../utils/webhook');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('orderstart')
    .setDescription('Start service for a customer')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('User to activate the service for')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('bots')
        .setDescription('Number of bots to join server')
        .setRequired(true)),

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

      const targetUser = interaction.options.getUser('user');
      const botsCount = interaction.options.getInteger('bots');

      // Get the target member
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!member) {
        return interaction.editReply(`❌ Could not find member ${targetUser.tag} in this server.`);
      }

      // Role assignment step
      const roleIdToAssign = process.env.ACTIVE_ROLE_ID || '1346626908935385139'; // Customer role ID
      if (roleIdToAssign) {
        try {
          await member.roles.add(roleIdToAssign);
          console.log(`Assigned role to ${targetUser.tag}`);
        } catch (roleError) {
          console.error(`Error assigning role to ${targetUser.tag}:`, roleError);
          await interaction.channel.send(`⚠️ Warning: Could not assign role to ${targetUser}. Please check bot permissions.`);
        }
      }

      // Generate order ID
      const orderId = `ORDER-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;

      // Store order start time
      if (!global.activeOrders) {
        global.activeOrders = new Map();
      }

      const orderData = {
        userId: targetUser.id,
        startTime: new Date(),
        orderId: orderId,
        botsCount: botsCount,
        staffId: interaction.user.id
      };

      global.activeOrders.set(orderId, orderData);

      // Log to order history
      if (!global.userOrderHistory) {
        global.userOrderHistory = new Map();
      }

      const userHistory = global.userOrderHistory.get(targetUser.id) || [];
      userHistory.push({
        orderId: orderId,
        startTime: new Date(),
        botsCount: botsCount,
        staffId: interaction.user.id,
        active: true
      });
      global.userOrderHistory.set(targetUser.id, userHistory);

      // Create success embed for confirmation
      const successEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **SERVICE ACTIVATED**')
        .setDescription(`***Service has been successfully activated for ${targetUser}***`)
        .addFields(
          { name: '**Order ID**', value: `\`${orderId}\``, inline: true },
          { name: '**Bots Count**', value: `\`${botsCount}\``, inline: true },
          { name: '**Status**', value: '✅ **Active**', inline: true }
        )
        .setColor(0x9B59B6)
        .setTimestamp()
        .setFooter({ text: 'ERLC Alting Support' });

      // Send logs to the dedicated webhook
      const webhookEmbed = new EmbedBuilder()
        .setTitle('🚀 New Order Started')
        .setDescription(`Order has been started for ${targetUser}`)
        .addFields(
          { name: 'Order ID', value: orderId, inline: true },
          { name: 'Bots Count', value: `${botsCount}`, inline: true },
          { name: 'Staff Member', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Start Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
        )
        .setColor(0x00FF00)
        .setTimestamp();

      // Send to webhook
      sendWebhook('https://discord.com/api/webhooks/1346648189117272174/QK2jHQDKoDwxM4Ec-3gdnDEfsjHj8vGRFuM5tFwdYL-WKAi3TiOYwMVi0ok8wZOEsAML', { embeds: [webhookEmbed] });

      // Send success message in the channel
      await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
      console.error('Error activating service:', error);
      await interaction.editReply('❌ There was an error activating the service! Please try again or contact an administrator.');
    }
  }
};