
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Set up welcome message configuration')
    .addBooleanOption(option =>
      option.setName('enabled')
        .setDescription('Enable or disable welcome messages')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Only owners can use this command
      const ownersIds = ['523693281541095424', '1011347151021953145'];
      if (!ownersIds.includes(interaction.user.id)) {
        return interaction.editReply('❌ Only the bot owner can use this command!');
      }

      const enabled = interaction.options.getBoolean('enabled');
      
      // Store in global config
      if (!global.config) {
        global.config = {};
      }
      
      global.config.welcome = {
        enabled: enabled,
        channelId: '1337553581250838639',
        rulesChannelId: '1337591756161683466',
        termsChannelId: '1337495477050146938'
      };

      // Confirm settings
      const settingsEmbed = new EmbedBuilder()
        .setTitle('Welcome Message Settings')
        .setDescription(`Welcome messages have been ${enabled ? 'enabled' : 'disabled'}.`)
        .addFields(
          { name: 'Status', value: enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: 'Welcome Channel', value: `<#1337553581250838639>`, inline: true },
          { name: 'Rules Channel', value: `<#1337591756161683466>`, inline: true },
          { name: 'Terms Channel', value: `<#1337495477050146938>`, inline: true }
        )
        .setColor(0x9B59B6)
        .setTimestamp();

      await interaction.editReply({ embeds: [settingsEmbed] });

    } catch (error) {
      console.error('Error with welcome command:', error);
      await interaction.editReply('❌ There was an error updating welcome settings!');
    }
  }
};
