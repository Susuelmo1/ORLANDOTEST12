const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('orderid')
    .setDescription('Get information about an order by ID')
    .addStringOption(option => 
      option.setName('orderid')
        .setDescription('The order ID to look up')
        .setRequired(true)),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Check if user has staff role or is owner
      const staffRoleId = process.env.STAFF_ROLE_ID || '1336741474708230164';
      const supportRoleId = '1336746451761631354'; // Support crew role ID
      const isStaff = interaction.member.roles.cache.has(staffRoleId);
      const isSupport = interaction.member.roles.cache.has(supportRoleId);
      const ownersIds = ['523693281541095424', '1011347151021953145'];
      const isOwner = ownersIds.includes(interaction.user.id);

      if (!isStaff && !isSupport && !isOwner) {
        return interaction.editReply('❌ Only staff members and support crew can use this command!');
      }

      const orderId = interaction.options.getString('orderid').trim(); //Added trim to remove extra spaces

      // Check if order ID exists
      if (!client.orderProofs || !client.orderProofs.has(orderId)) {
        return interaction.editReply(`❌ Order ID \`${orderId}\` not found! Make sure the user has submitted order proof first.`);
      }

      // Get order details
      const orderDetails = client.orderProofs.get(orderId);

      // Format timestamp
      const orderDate = orderDetails.timestamp ? new Date(orderDetails.timestamp) : new Date();
      const formattedDate = orderDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Format expiration date
      const expirationDate = orderDetails.expirationDate || new Date();
      const formattedExpiration = expirationDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

      // Create a beautiful embed
      const orderEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **ORDER DETAILS**')
        .setDescription(`***Order information for ID: \`${orderId}\`***`)
        .addFields(
          { name: '**User**', value: `<@${orderDetails.userId}>`, inline: true },
          { name: '**Roblox Username**', value: `\`${orderDetails.robloxUsername}\``, inline: true },
          { name: '**Package**', value: `\`${orderDetails.package}\``, inline: true },
          { name: '**Duration**', value: `\`${orderDetails.duration}\``, inline: true },
          { name: '**Order Date**', value: `\`${formattedDate}\``, inline: true },
          { name: '**Expires On**', value: `\`${formattedExpiration}\``, inline: true },
          { name: '**Queue Position**', value: `\`${orderDetails.queueNumber || 'N/A'}\``, inline: true },
          { name: '**<:PurpleLine:1336946927282950165> Purchase Proof**', value: `[Click to View](${orderDetails.screenshotUrl})` }
        )
        .setColor(0x9B59B6)
        .setThumbnail(orderDetails.screenshotUrl)
        .setTimestamp();

      await interaction.editReply({ embeds: [orderEmbed] });

      // Log the lookup for security
      try {
        const webhookUrl = process.env.LOG_WEBHOOK_URL || 'https://discord.com/api/webhooks/1346305081678757978/91mevrNJ8estfsvHZOpLOQU_maUJhqElxUpUGqqXS0VLWZe3o_UCVqiG7inceETjSL09';
        const { WebhookClient } = require('discord.js');
        const webhook = new WebhookClient({ url: webhookUrl });

        const logEmbed = new EmbedBuilder()
          .setTitle('Order ID Lookup')
          .setDescription(`Order ID \`${orderId}\` was looked up by ${interaction.user.tag}`)
          .addFields(
            { name: 'Staff Member', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Roblox Username', value: `\`${orderDetails.robloxUsername}\``, inline: true },
            { name: 'Customer', value: `<@${orderDetails.userId}>`, inline: true },
            { name: 'Channel', value: `<#${interaction.channel.id}>`, inline: false }
          )
          .setColor(0x9B59B6)
          .setTimestamp();

        await webhook.send({ embeds: [logEmbed] });
      } catch (webhookError) {
        console.error('Error sending webhook:', webhookError);
      }

    } catch (error) {
      console.error('Error looking up order:', error);
      await interaction.editReply('❌ There was an error looking up the order information! Please try again.');
    }
  }
};