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

      // Assuming the logic checks of keys and orders go here...

      // Perform actions for activating the order
      // Role assignment step
      const roleIdToAssign = process.env.ACTIVE_ROLE_ID; // Use your role ID
      const member = interaction.guild.members.cache.get(targetUser.id);
      if (member && roleIdToAssign) {
        await member.roles.add(roleIdToAssign);
        console.log(`Assigned role to ${targetUser.tag}`);
      }

      // Queue details message
      const queueNumber = await getQueueNumber(orderId); // Implement this to calculate the queue number based on your logic
      await interaction.channel.send(`${targetUser}, your order has been activated! You are queued as number ${queueNumber}. Estimated wait: ${Math.ceil(queueNumber * 2)} minutes.`);

      // Create success embed for confirmation
      const successEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **SERVICE ACTIVATED**')
        .setDescription(`***Service has been successfully activated for ${targetUser}***`)
        .addFields(
          { name: '**Key Used**', value: `\`${key}\``, inline: true },
          { name: '**Order ID**', value: `\`${orderId}\``, inline: true },
          { name: '**Status**', value: '✅ **Active**', inline: true }
        )
        .setColor(0x9B59B6)
        .setTimestamp()
        .setFooter({ text: 'ERLC Alting Support' });

      // Send success message in the channel
      await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
      console.error('Error activating service:', error);
      await interaction.editReply('❌ There was an error activating the service! Please try again or contact an administrator.');
    }
  }
};

// Function to calculate queue number (example implementation)
async function getQueueNumber(orderId) {
  // Implement logic to get the queue number based on your existing tracking system
  return 1; // Placeholder return value for this example
}