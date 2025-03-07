
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rules')
    .setDescription('Display server rules in the current channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Display rules in the current channel
      const channel = interaction.channel;

      const rulesEmbed = new EmbedBuilder()
        .setTitle('ERLC Alting Rules')
        .setDescription('Welcome to ERLC ALTING SERVER! Please follow the rules below to keep everything calm and steady. Violations will result in warnings and penalties.')
        .addFields(
          { 
            name: '**<:1_:1337594940179353681> Respect**',
            value: 'Treat everyone with respect. Disrespect of any kind will not be tolerated.\n<:PurpleLine:1336946927282950165>'
          },
          { 
            name: '**<:2_:1337594974233165958> Bullying & Harassment**',
            value: 'Bullying, harassment, and targeting members are prohibited and will result in penalties.\n<:PurpleLine:1336946927282950165>'
          },
          { 
            name: '**<:3_:1337595007548264448> Advertising**',
            value: 'Advertising is strictly prohibited, including DM advertising.\n<:PurpleLine:1336946927282950165>'
          },
          { 
            name: '**<:4_:1337594940179353681> Discord Terms of Service**',
            value: 'Comply with the Discord Terms of Service at all times. Violations will not be tolerated.\n<:PurpleLine:1336946927282950165>'
          },
          { 
            name: '**<:5_:1337594974233165958> Pinging Staff**',
            value: 'Do not spam ping staff members. Use the ticket system for support.\n<:PurpleLine:1336946927282950165>'
          },
          { 
            name: '**<:6_:1337595007548264448> Channel Usage**',
            value: 'Use each channel for its designated purpose (e.g., ⁠📸┃media for Media).\n<:PurpleLine:1336946927282950165>'
          },
          { 
            name: '**<:7_:1337594940179353681> Private Information**',
            value: 'Do not share personal information. This will result in harsh moderation actions.\n<:PurpleLine:1336946927282950165>'
          }
        )
        .addFields(
          { 
            name: '**<:PurpleLine:1336946927282950165> Penalties**',
            value: '**3 Warnings:** Softban/Kick | **6 Warnings:** Temp Ban (6-12 Days) | **8 Warnings:** Permanent Ban'
          },
          { 
            name: '**<:PurpleLine:1336946927282950165> Discord Markdown**',
            value: '```\nText Formatting\nItalics: *italics* or _italics_    Underline italics: __*underline italics*__\nBold: **bold**                    Underline bold: __**underline bold**__\nBold Italics: ***bold italics***  Underline bold italics: __***underline bold italics***__\nUnderline: __underline__          Strikethrough: ~~Strikethrough~~\n```'
          }
        )
        .setImage('https://cdn.discordapp.com/attachments/1336783170422571008/1336939044743155723/Screenshot_2025-02-05_at_10.58.23_PM.png')
        .setThumbnail('https://media.discordapp.net/attachments/1336783170422571008/1336938605578289234/Screenshot_2025-02-05_at_10.08.18_PM-removebg-preview.png')
        .setColor(0x9B59B6);

      await channel.send({ embeds: [rulesEmbed] });
      await interaction.editReply('✅ Server rules posted successfully!');

    } catch (error) {
      console.error('Error posting rules:', error);
      await interaction.editReply('❌ An error occurred while posting the rules. Error: ' + error.message);
    }
  }
};
