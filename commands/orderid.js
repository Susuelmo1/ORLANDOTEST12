
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const crypto = require('crypto');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('orderid')
    .setDescription('Lookup order details by ID')
    .addStringOption(option =>
      option.setName('orderid')
        .setDescription('Order ID to lookup')
        .setRequired(true)),

  async execute(interaction, client) {
    await interaction.deferReply();

    try {
      const orderId = interaction.options.getString('orderid');

      // Check if the client has orderProofs map
      if (!client.orderProofs) {
        return interaction.editReply('❌ No orders found in the system.');
      }

      // Get order details from the map
      const orderDetails = client.orderProofs.get(orderId);

      if (!orderDetails) {
        return interaction.editReply('❌ Order ID not found. Please check the ID and try again.');
      }

      // Create embedded message with order details
      const orderEmbed = new EmbedBuilder()
        .setTitle('🧾 Order Details')
        .setDescription(`**Order ID:** \`${orderId}\``)
        .addFields(
          { name: 'Roblox Username', value: orderDetails.robloxUsername || 'Not provided' },
          { name: 'Product', value: orderDetails.product || 'Not specified' },
          { name: 'Submitted At', value: orderDetails.timestamp ? orderDetails.timestamp.toLocaleString() : 'Unknown' }
        )
        .setColor(0x9B59B6)
        .setImage(orderDetails.screenshotUrl)
        .setTimestamp()
        .setFooter({ text: 'ERLC Alting Support' });

      // Check if this is a staff member (has the staff role)
      const staffRoleId = process.env.STAFF_ROLE_ID || '1336741474708230164';
      const isStaff = interaction.member.roles.cache.has(staffRoleId);

      // If it's a staff member, add the complete button
      if (isStaff) {
        await interaction.editReply({ 
          content: 'Order details found:',
          embeds: [orderEmbed]
        });

        // Add additional message with instructions for staff
        await interaction.channel.send({
          content: `<@${interaction.user.id}>, use \`/generatekey\` to generate a key for this order.`,
          ephemeral: false
        });
      } else {
        await interaction.editReply({ 
          content: 'Your order details:',
          embeds: [orderEmbed]
        });
      }

    } catch (error) {
      console.error('Error processing order ID:', error);
      await interaction.editReply('❌ There was an error processing your order ID!');
    }
  }
};
