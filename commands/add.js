
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Add a user to the current ticket')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('User to add to the ticket')
        .setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const channel = interaction.channel;
      const user = interaction.options.getUser('user');

      // Check if this is a ticket channel
      if (!channel.name.includes('ticket') && 
          !channel.name.includes('order') && 
          !channel.name.includes('support') && 
          !channel.name.includes('vip')) {
        return interaction.editReply('❌ **This command can only be used in ticket channels!**');
      }

      // Add the user to the ticket channel
      await channel.permissionOverwrites.create(user.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
      });

      await interaction.editReply(`✅ **Successfully added ${user} to the ticket!**`);
      
      // Send notification in the channel
      await channel.send(`${user} has been **added to the ticket** by ${interaction.user}!`);

    } catch (error) {
      console.error('Error adding user to ticket:', error);
      await interaction.editReply('❌ **There was an error adding the user to this ticket!**');
    }
  }
};
