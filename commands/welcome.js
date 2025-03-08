
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

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

    // Only owners can use this command
    const ownersIds = ['523693281541095424', '1011347151021953145'];
    if (!ownersIds.includes(interaction.user.id)) {
      return interaction.editReply('❌ Only the bot owner can use this command!');
    }

    const enabled = interaction.options.getBoolean('enabled');
    
    // Set welcome configuration
    if (!global.config) {
      global.config = {};
    }
    
    if (!global.config.welcome) {
      global.config.welcome = {};
    }
    
    global.config.welcome.enabled = enabled;
    global.config.welcome.channelId = '1337553581250838639';
    global.config.welcome.rulesChannelId = '1337591756161683466';
    global.config.welcome.termsChannelId = '1337495477050146938';
    
    // Log the welcome message if enabled
    if (enabled) {
      const channelId = global.config.welcome.channelId;
      const rulesChannelId = global.config.welcome.rulesChannelId;
      const termsChannelId = global.config.welcome.termsChannelId;
      const channel = client.channels.cache.get(channelId);

      if (channel) {
        channel.send(`Welcome ${interaction.user} to .gg/alterlc! 👋 Please check out <#${rulesChannelId}> and <#${termsChannelId}> to begin your journey.`);
      }
    }

    // Confirm the status
    const settingsMessage = `Welcome messages have been ${enabled ? 'enabled' : 'disabled'}.`;
    await interaction.editReply({ content: settingsMessage });
  }
};
