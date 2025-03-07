
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { exec } = require('child_process');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('restart')
    .setDescription('Restart the bot (Owner only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Only owners can use this command
      const ownersIds = ['523693281541095424', '1011347151021953145'];
      if (!ownersIds.includes(interaction.user.id)) {
        return interaction.editReply('❌ Only the bot owner can use this command!');
      }

      await interaction.editReply('✅ Bot is restarting...');

      // Use process.exit() to let the process manager restart the bot
      setTimeout(() => {
        process.exit(0);
      }, 1000);

    } catch (error) {
      console.error('Error restarting bot:', error);
      await interaction.editReply('❌ There was an error restarting the bot!');
    }
  }
};
