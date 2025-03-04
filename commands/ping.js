
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot response time'),

  async execute(interaction, client) {
    await interaction.deferReply();

    try {
      const pingEmbed = new EmbedBuilder()
        .setTitle('SUPPORT')
        .setDescription(`🏓 Latency is ${Date.now() - interaction.createdTimestamp}ms`)
        .setColor(0x9B59B6)
        .setFooter({ text: 'ERLC Alting Support' });

      await interaction.editReply({ embeds: [pingEmbed] });

    } catch (error) {
      console.error('Error with ping command:', error);
      await interaction.editReply('❌ There was an error checking ping!');
    }
  }
};
