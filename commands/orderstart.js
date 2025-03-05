
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('orderstart')
    .setDescription('Start service using a generated key and order ID')
    .addStringOption(option => 
      option.setName('key')
        .setDescription('The generated key to activate')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('orderid')
        .setDescription('The order ID to activate')
        .setRequired(true))
    .addUserOption(option => 
      option.setName('user')
        .setDescription('User to activate the service for')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('time')
        .setDescription('Duration in days (e.g., 7, 30, 365 for lifetime)')
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

      const key = interaction.options.getString('key');
      const orderId = interaction.options.getString('orderid');
      const targetUser = interaction.options.getUser('user');
      const time = interaction.options.getInteger('time');
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

      // Store order start time
      if (!global.activeOrders) {
        global.activeOrders = new Map();
      }
      
      const orderData = {
        userId: targetUser.id,
        startTime: new Date(),
        duration: time * 24 * 60 * 60 * 1000, // Convert days to milliseconds
        orderId: orderId,
        key: key,
        botsCount: botsCount,
        staffId: interaction.user.id
      };
      
      global.activeOrders.set(orderId, orderData);

      // Calculate queue position (simulated)
      const queueNumber = Math.floor(Math.random() * 3) + 1;
      await interaction.channel.send(`${targetUser}, your order has been activated! You are queued as number ${queueNumber}. Estimated wait: ${Math.ceil(queueNumber * 2)} minutes.`);

      // Log to order history
      if (!global.userOrderHistory) {
        global.userOrderHistory = new Map();
      }

      const userHistory = global.userOrderHistory.get(targetUser.id) || [];
      userHistory.push({
        orderId: orderId,
        key: key,
        startTime: new Date(),
        duration: time,
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
          { name: '**Key Used**', value: `\`${key}\``, inline: true },
          { name: '**Order ID**', value: `\`${orderId}\``, inline: true },
          { name: '**Bots Count**', value: `\`${botsCount}\``, inline: true },
          { name: '**Duration**', value: `\`${time} days\``, inline: true },
          { name: '**Status**', value: '✅ **Active**', inline: true }
        )
        .setColor(0x9B59B6)
        .setTimestamp()
        .setFooter({ text: 'ERLC Alting Support' });

      // Send logs to the dedicated webhook
      try {
        const { WebhookClient } = require('discord.js');
        const orderWebhook = new WebhookClient({ url: 'https://discord.com/api/webhooks/1346648189117272174/QK2jHQDKoDwxM4Ec-3gdnDEfsjHj8vGRFuM5tFwdYL-WKAi3TiOYwMVi0ok8wZOEsAML' });
        
        const webhookEmbed = new EmbedBuilder()
          .setTitle('🚀 New Order Started')
          .setDescription(`Order has been started for ${targetUser}`)
          .addFields(
            { name: 'Order ID', value: orderId, inline: true },
            { name: 'Bots Count', value: `${botsCount}`, inline: true },
            { name: 'Duration', value: `${time} days`, inline: true },
            { name: 'Staff Member', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Start Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
          )
          .setColor(0x00FF00)
          .setTimestamp();
        
        await orderWebhook.send({ embeds: [webhookEmbed] });
      } catch (webhookError) {
        console.error('Error sending to order webhook:', webhookError);
      }

      // Send instruction message for ERLC game joining
      const instructionEmbed = new EmbedBuilder()
        .setTitle('🎮 ERLC Bot Instructions')
        .setDescription(`**The system will now join ${botsCount} bots to your ERLC server**`)
        .addFields(
          { name: '📋 Next Steps', value: 'Please provide your private server code in the channel to complete the process.' },
          { name: '⏱️ Expected Time', value: `Your bots will join within approximately ${Math.ceil(botsCount / 5)} minutes.` },
          { name: '❓ Support', value: 'If you encounter any issues, please contact staff for assistance.' }
        )
        .setColor(0x9B59B6);

      // Send success message in the channel
      await interaction.editReply({ embeds: [successEmbed] });
      await interaction.channel.send({ embeds: [instructionEmbed] });

    } catch (error) {
      console.error('Error activating service:', error);
      await interaction.editReply('❌ There was an error activating the service! Please try again or contact an administrator.');
    }
  }
};
