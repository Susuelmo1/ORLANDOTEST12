
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
        .setRequired(true)),

  async execute(interaction, client) {
    await interaction.deferReply();

    try {
      // Check if user has staff role
      const staffRoleId = process.env.STAFF_ROLE_ID || '1336741474708230164';
      const isStaff = interaction.member.roles.cache.has(staffRoleId);

      if (!isStaff) {
        return interaction.editReply('❌ You do not have permission to use this command!');
      }

      const key = interaction.options.getString('key');
      const orderId = interaction.options.getString('orderid');
      const targetUser = interaction.options.getUser('user');

      // Check if the key exists and is valid (in a real system, this would query a database)
      if (key.length < 16) {
        return interaction.editReply('❌ Invalid key format. Please check the key and try again.');
      }

      // Look up order details if available
      let orderDetails = null;
      let screenshotUrl = null;

      if (client.orderProofs && client.orderProofs.has(orderId)) {
        orderDetails = client.orderProofs.get(orderId);
        screenshotUrl = orderDetails.screenshotUrl;
      }

      // Create success embed with purple theme
      const successEmbed = new EmbedBuilder()
        .setTitle('🚀 Service Activated')
        .setDescription(`Service has been successfully activated for ${targetUser}`)
        .addFields(
          { name: 'Key Used', value: `\`${key}\``, inline: true },
          { name: 'Order ID', value: `\`${orderId}\``, inline: true },
          { name: 'Activated By', value: `${interaction.user}`, inline: true },
          { name: 'Status', value: '✅ Active', inline: true }
        )
        .setColor(0x9B59B6) // Purple color
        .setTimestamp()
        .setFooter({ text: 'ERLC Alting Support' })
        .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png');

      // Add screenshot if available
      if (screenshotUrl) {
        successEmbed.setThumbnail(screenshotUrl);
        successEmbed.addFields({ name: 'Order Proof', value: 'Screenshot attached', inline: true });
      }

      // Try to add customer role to the user
      try {
        const customerRoleId = '1345908233700773978'; // Alting Customer role ID
        const member = await interaction.guild.members.fetch(targetUser.id);

        // Force role update with higher priority
        await member.roles.add(customerRoleId, 'Alting service activation')
          .then(() => {
            successEmbed.addFields({ name: 'Role Added', value: '✅ Alting Customer role assigned', inline: false });
          })
          .catch((roleError) => {
            console.error('Error adding role:', roleError);
            successEmbed.addFields({ name: 'Role Added', value: '❌ Could not assign Alting Customer role', inline: false });
          });
      } catch (error) {
        console.error('Error managing roles:', error);
        successEmbed.addFields({ name: 'Role Added', value: '❌ Could not assign Alting Customer role', inline: false });
      }

      // Notify the user via DM
      try {
        const userDmEmbed = new EmbedBuilder()
          .setTitle('🎉 Your ERLC Alting Service is Now Active!')
          .setDescription('Your service has been activated and is ready to use!')
          .addFields(
            { name: 'Important', value: 'Remember to keep your key secure and never share it with others.' },
            { name: 'Need Help?', value: 'If you have any questions or need assistance, please open a support ticket in our server.' }
          )
          .setColor(0x9B59B6)
          .setTimestamp()
          .setFooter({ text: 'ERLC Alting Support' });

        await targetUser.send({ embeds: [userDmEmbed] });
      } catch (dmError) {
        console.error('Could not send DM to user:', dmError);
        await interaction.channel.send(`Note: Unable to send activation notification to ${targetUser} via DM.`);
      }

      await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
      console.error('Error activating service:', error);
      await interaction.editReply('❌ There was an error activating the service! Please try again or contact an administrator.');
    }
  }
};
