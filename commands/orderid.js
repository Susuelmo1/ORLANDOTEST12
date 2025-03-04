
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
    await interaction.deferReply();

    try {
      // Check if user has staff role or is owner
      const staffRoleId = process.env.STAFF_ROLE_ID || '1336741474708230164';
      const isStaff = interaction.member.roles.cache.has(staffRoleId);
      const ownersIds = ['523693281541095424', '1011347151021953145'];
      const isOwner = ownersIds.includes(interaction.user.id);

      if (!isStaff && !isOwner) {
        return interaction.editReply('❌ Only staff members can use this command!');
      }

      const orderId = interaction.options.getString('orderid');

      // Check if order ID exists
      if (!client.orderProofs || !client.orderProofs.has(orderId)) {
        return interaction.editReply(`❌ Order ID \`${orderId}\` not found!`);
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
          { name: '**<:PurpleLine:1336946927282950165> Purchase Proof**', value: `[Click to View](${orderDetails.screenshotUrl})` }
        )
        .setColor(0x9B59B6)
        .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png')
        .setThumbnail(orderDetails.screenshotUrl)
        .setFooter({ text: 'ERLC Alting Support' })
        .setTimestamp();

      await interaction.editReply({ embeds: [orderEmbed] });

    } catch (error) {
      console.error('Error looking up order:', error);
      await interaction.editReply('❌ There was an error looking up the order information! Please try again.');
    }
  }
};
