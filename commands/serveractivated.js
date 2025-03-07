const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serveractivated')
    .setDescription('Send a server activated message with a purple line'),

  async execute(interaction, client) {
    await interaction.deferReply();

    try {
      // Check if user has staff role
      const staffRoleId = process.env.STAFF_ROLE_ID || '1336741474708230164';
      const isStaff = interaction.member.roles.cache.has(staffRoleId);

      if (!isStaff) {
        return interaction.editReply('❌ Only staff members can use this command!');
      }

      // Create a server activated embed with a purple line design
      const serverActivatedEmbed = new EmbedBuilder()
        .setTitle('<:purplearrow:1337594384631332885> **SERVER ACTIVATED**')
        .setDescription('Your server has been successfully activated!')
        .addFields(
          { name: 'Status', value: '✅ Active', inline: true },
          { name: 'Activated By', value: `${interaction.user}`, inline: true }
        )
        .setColor(0x9B59B6) // Purple color
        .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png')
        .setTimestamp()
        .setFooter({ text: 'ERLC Alting Support' });

      await interaction.editReply({ embeds: [serverActivatedEmbed] });

    } catch (error) {
      console.error('Error sending server activated message:', error);
      await interaction.editReply('❌ There was an error sending the server activated message!');
    }
  }
};